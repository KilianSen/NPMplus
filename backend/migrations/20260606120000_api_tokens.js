import { migrate as logger } from "../logger.js";

const migrateName = "api_tokens";

/**
 * Migrate
 *
 * @see https://knexjs.org/guide/migrations.html#migration-api
 *
 * @param   {Object} knex
 * @returns {Promise}
 */
const up = (knex) => {
	logger.info(`[${migrateName}] Migrating Up...`);

	return knex.schema
		.createTable("api_token", (table) => {
			table.increments().primary();
			table.dateTime("created_on").notNull();
			table.dateTime("modified_on").notNull();
			table.integer("user_id").notNull().unsigned();
			table.string("name", 255).notNull();
			// SHA-256 hex digest of the secret; the plaintext secret is never stored.
			table.string("hash", 64).notNull();
			// First few characters of the secret, stored for display purposes only.
			table.string("prefix", 24).notNull();
			table.dateTime("expires_on").nullable();
			table.dateTime("last_used_on").nullable();
			table.integer("is_deleted").notNull().unsigned().defaultTo(0);
			table.unique("hash");
			table.index("user_id");
		})
		.then(() => {
			logger.info(`[${migrateName}] api_token Table created`);
		});
};

/**
 * Undo Migrate
 *
 * @param   {Object} knex
 * @returns {Promise}
 */
const down = (knex) => {
	logger.info(`[${migrateName}] Migrating Down...`);

	return knex.schema.dropTable("api_token").then(() => {
		logger.info(`[${migrateName}] api_token Table dropped`);
	});
};

export { up, down };
