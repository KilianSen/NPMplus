import express from "express";
import internalApiToken from "../internal/api-token.js";
import jwtdecode from "../lib/express/jwt-decode.js";
import apiValidator from "../lib/validator/api.js";
import { debug, express as logger } from "../logger.js";
import { getValidationSchema } from "../schema/index.js";

const router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

/**
 * /api/api-tokens
 */
router
	.route("/")
	.options((_, res) => {
		res.sendStatus(204);
	})
	.all(jwtdecode())

	/**
	 * GET /api/api-tokens
	 *
	 * Retrieve all API tokens for the current user (or all, for admins)
	 */
	.get(async (_, res, next) => {
		try {
			const tokens = await internalApiToken.getAll(res.locals.access);
			res.status(200).send(tokens);
		} catch (err) {
			debug(logger, `GET /api/api-tokens: ${err}`);
			next(err);
		}
	})

	/**
	 * POST /api/api-tokens
	 *
	 * Create a new API token. The plaintext secret is returned only once.
	 */
	.post(async (req, res, next) => {
		try {
			const payload = await apiValidator(getValidationSchema("/api-tokens", "post"), req.body);
			const token = await internalApiToken.create(res.locals.access, payload);
			res.status(201).send(token);
		} catch (err) {
			debug(logger, `POST /api/api-tokens: ${err}`);
			next(err);
		}
	});

/**
 * /api/api-tokens/:token_id
 */
router
	.route("/:token_id")
	.options((_, res) => {
		res.sendStatus(204);
	})
	.all(jwtdecode())

	/**
	 * PUT /api/api-tokens/:token_id
	 *
	 * Rename a token or change its expiry
	 */
	.put(async (req, res, next) => {
		try {
			const payload = await apiValidator(getValidationSchema("/api-tokens/{tokenID}", "put"), req.body);
			payload.id = Number.parseInt(req.params.token_id, 10);
			const token = await internalApiToken.update(res.locals.access, payload);
			res.status(200).send(token);
		} catch (err) {
			debug(logger, `PUT /api/api-tokens/${req.params.token_id}: ${err}`);
			next(err);
		}
	})

	/**
	 * DELETE /api/api-tokens/:token_id
	 *
	 * Revoke (delete) a token
	 */
	.delete(async (req, res, next) => {
		try {
			const result = await internalApiToken.delete(res.locals.access, Number.parseInt(req.params.token_id, 10));
			res.status(200).send(result);
		} catch (err) {
			debug(logger, `DELETE /api/api-tokens/${req.params.token_id}: ${err}`);
			next(err);
		}
	});

export default router;
