import express from "express";
import internalFavicon from "../internal/favicon.js";

const router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

/**
 * /api/favicon/:domain
 */
router
	.route("/:domain")
	.options((_, res) => {
		res.sendStatus(204);
	})

	/**
	 * GET /api/favicon/:domain
	 *
	 * Serve a domain's site favicon, cached same-origin so it passes the app's CSP.
	 * Responds 404 when no favicon is available so the frontend can hide it.
	 */
	.get(async (req, res) => {
		const result = await internalFavicon.get(req.params.domain);
		if (!result) {
			res.sendStatus(404);
			return;
		}
		res.set("Content-Type", result.contentType);
		res.set("Cache-Control", `public, max-age=${internalFavicon.BROWSER_MAX_AGE}`);
		res.send(result.buffer);
	});

export default router;
