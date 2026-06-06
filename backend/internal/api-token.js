import crypto from "node:crypto";
import _ from "lodash";
import errs from "../lib/error.js";
import { parseDatePeriod } from "../lib/helpers.js";
import apiTokenModel from "../models/api_token.js";
import userModel from "../models/user.js";
import internalAuditLog from "./audit-log.js";

// Human-recognisable prefix so leaked secrets can be identified and scanned for.
const SECRET_PREFIX = "npmplus_";
// Number of leading characters (including the prefix) stored in cleartext for display.
const DISPLAY_PREFIX_LENGTH = SECRET_PREFIX.length + 6;

/**
 * Generate a new opaque API token secret.
 *
 * @returns {String}
 */
const generateSecret = () => `${SECRET_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;

/**
 * Hash a secret for storage / lookup. The plaintext secret is never persisted.
 *
 * @param   {String} secret
 * @returns {String}
 */
const hashSecret = (secret) => crypto.createHash("sha256").update(secret).digest("hex");

/**
 * Loads the active user behind the access token, confirming they still exist and
 * are not disabled, and exposing their roles so admins can manage all tokens.
 *
 * @param   {Access} access
 * @returns {Promise<Object>}
 */
const getActor = async (access) => {
	const userId = access?.token?.getUserId(0);
	if (!userId) {
		throw new errs.PermissionError("Permission Denied");
	}

	const user = await userModel
		.query()
		.where("id", userId)
		.andWhere("is_deleted", 0)
		.andWhere("is_disabled", 0)
		.first();

	if (!user) {
		throw new errs.PermissionError("Permission Denied");
	}

	user.roles = user.roles || [];
	return user;
};

const omitSecretFields = ["hash"];

const internalApiToken = {
	/**
	 * Create a new API token for the current user. The plaintext secret is returned
	 * exactly once and cannot be retrieved again.
	 *
	 * @param   {Access} access
	 * @param   {Object} data
	 * @param   {String} data.name
	 * @param   {String} [data.expiry]  Date period expression such as "30d", "1y". Omit for no expiry.
	 * @returns {Promise<Object>}
	 */
	create: async (access, data) => {
		const actor = await getActor(access);

		let expiresOn = null;
		if (data.expiry) {
			const expiry = parseDatePeriod(data.expiry);
			if (expiry === null) {
				throw new errs.ValidationError(`Invalid expiry time: ${data.expiry}`);
			}
			expiresOn = expiry.toISOString();
		}

		const secret = generateSecret();

		const row = await apiTokenModel.query().insertAndFetch({
			user_id: actor.id,
			name: data.name,
			hash: hashSecret(secret),
			prefix: secret.substring(0, DISPLAY_PREFIX_LENGTH),
			expires_on: expiresOn,
		});

		await internalAuditLog.add(access, {
			action: "created",
			object_type: "api-token",
			object_id: row.id,
			meta: { name: row.name },
		});

		// The secret is included here ONLY on creation and never stored or returned again.
		return { ..._.omit(row, omitSecretFields), secret };
	},

	/**
	 * List the current user's API tokens (or all tokens, for admins).
	 *
	 * @param   {Access} access
	 * @returns {Promise<Array>}
	 */
	getAll: async (access) => {
		const actor = await getActor(access);

		const query = apiTokenModel.query().where("is_deleted", 0).orderBy("created_on", "DESC").orderBy("id", "DESC");

		if (!actor.roles.includes("admin")) {
			query.andWhere("user_id", actor.id);
		}

		const rows = await query;
		return rows.map((row) => _.omit(row, omitSecretFields));
	},

	/**
	 * Fetch a single token owned by the actor (or any token, for admins).
	 *
	 * @param   {Access} access
	 * @param   {Number} id
	 * @returns {Promise<Object>}
	 */
	get: async (access, id) => {
		const actor = await getActor(access);

		const query = apiTokenModel.query().where("is_deleted", 0).andWhere("id", id).first();
		if (!actor.roles.includes("admin")) {
			query.andWhere("user_id", actor.id);
		}

		const row = await query;
		if (!row) {
			throw new errs.ItemNotFoundError(id);
		}
		return row;
	},

	/**
	 * Rename or change the expiry of a token.
	 *
	 * @param   {Access} access
	 * @param   {Object} data
	 * @param   {Number} data.id
	 * @param   {String} [data.name]
	 * @param   {String} [data.expiry]  Date period expression, or null to clear the expiry.
	 * @returns {Promise<Object>}
	 */
	update: async (access, data) => {
		const existing = await internalApiToken.get(access, data.id);

		const patch = {};
		if (typeof data.name !== "undefined") {
			patch.name = data.name;
		}
		if (typeof data.expiry !== "undefined") {
			if (data.expiry === null || data.expiry === "") {
				patch.expires_on = null;
			} else {
				const expiry = parseDatePeriod(data.expiry);
				if (expiry === null) {
					throw new errs.ValidationError(`Invalid expiry time: ${data.expiry}`);
				}
				patch.expires_on = expiry.toISOString();
			}
		}

		const row = await apiTokenModel.query().patchAndFetchById(existing.id, patch);

		await internalAuditLog.add(access, {
			action: "updated",
			object_type: "api-token",
			object_id: existing.id,
			meta: { name: row.name },
		});

		return _.omit(row, omitSecretFields);
	},

	/**
	 * Revoke (soft-delete) a token.
	 *
	 * @param   {Access} access
	 * @param   {Number} id
	 * @returns {Promise<Boolean>}
	 */
	delete: async (access, id) => {
		const existing = await internalApiToken.get(access, id);

		await apiTokenModel.query().where("id", existing.id).patch({ is_deleted: 1 });

		await internalAuditLog.add(access, {
			action: "deleted",
			object_type: "api-token",
			object_id: existing.id,
			meta: { name: existing.name },
		});

		return true;
	},

	/**
	 * Resolve an API token secret to its owning user id, for Bearer header auth.
	 * Returns null if the secret is unknown, revoked, or expired.
	 *
	 * @param   {String} secret
	 * @returns {Promise<Number|null>}
	 */
	resolveSecret: async (secret) => {
		if (typeof secret !== "string" || !secret.startsWith(SECRET_PREFIX)) {
			return null;
		}

		const row = await apiTokenModel.query().where("hash", hashSecret(secret)).andWhere("is_deleted", 0).first();

		if (!row) {
			return null;
		}

		if (row.expires_on && new Date(row.expires_on).getTime() <= Date.now()) {
			return null;
		}

		// Best-effort last-used tracking; never block auth on this write.
		apiTokenModel
			.query()
			.where("id", row.id)
			.patch({ last_used_on: new Date().toISOString() })
			.catch(() => {});

		return row.user_id;
	},
};

export default internalApiToken;
