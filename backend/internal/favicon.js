import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { favicon as logger } from "../logger.js";
import pjson from "../package.json" with { type: "json" };

const CACHE_DIR = "/data/npmplus/favicon";
const FETCH_TIMEOUT = 5000; // ms before giving up on a remote favicon
const MAX_BYTES = 256 * 1024; // reject favicons larger than 256 KiB
const NEGATIVE_TTL = 1000 * 60 * 60; // 1 hour before retrying a domain that had no favicon
const BROWSER_MAX_AGE = 60 * 60 * 24 * 7; // 7 days of client-side caching

// Remote content-types we accept, mapped to the extension we cache them under.
const TYPE_TO_EXT = {
	"image/x-icon": "ico",
	"image/vnd.microsoft.icon": "ico",
	"application/octet-stream": "ico", // many servers send /favicon.ico like this
	"image/png": "png",
	"image/svg+xml": "svg",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
};
// Reverse mapping used to serve cached files with the right content-type.
const EXT_TO_TYPE = {
	ico: "image/x-icon",
	png: "image/png",
	svg: "image/svg+xml",
	jpg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
};

// Resolved favicons kept in memory: hash -> { buffer, contentType }.
const cache = new Map();
// Domains we recently failed to fetch: clean domain -> timestamp. Avoids hammering.
const negativeCache = new Map();
// In-flight fetches deduped per hash so concurrent rows don't fetch the same domain twice.
const inflight = new Map();

/**
 * Accept only plausible public hostnames. Rejects IP literals, localhost and
 * internal suffixes to keep the SSRF surface of the remote fetch small.
 */
const isValidDomain = (domain) =>
	typeof domain === "string" &&
	domain.length <= 253 &&
	/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(domain) &&
	!/\.\d+$/.test(domain) && // last label must not be numeric (excludes IPv4)
	!/(^|\.)(localhost|local|internal|lan|home|intranet|corp)$/.test(domain);

/** Try to read a previously cached favicon for this hash from disk. */
async function readCached(hash) {
	for (const ext of Object.keys(EXT_TO_TYPE)) {
		try {
			const buffer = await readFile(`${CACHE_DIR}/${hash}.${ext}`);
			return { buffer, contentType: EXT_TO_TYPE[ext] };
		} catch {
			// not this extension; try the next
		}
	}
	return null;
}

/** Fetch https://<domain>/favicon.ico and return its bytes if it is a usable image. */
async function fetchFavicon(domain) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
	try {
		const response = await fetch(`https://${domain}/favicon.ico`, {
			signal: controller.signal,
			redirect: "follow",
			headers: { "User-Agent": `NPMplus/${pjson.version}` },
		});
		if (!response.ok) {
			return null;
		}
		const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
		const ext = TYPE_TO_EXT[contentType];
		if (!ext) {
			return null;
		}
		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.length === 0 || buffer.length > MAX_BYTES) {
			return null;
		}
		return { buffer, contentType: EXT_TO_TYPE[ext], ext };
	} finally {
		clearTimeout(timer);
	}
}

const internalFavicon = {
	/**
	 * Resolve a domain's favicon, caching it server-side so it can be served
	 * same-origin (the app's CSP blocks cross-origin images).
	 * @param {string} domain Raw domain, possibly with a leading "*.".
	 * @return {Promise<{buffer: Buffer, contentType: string}|null>} null when unavailable.
	 */
	get: async (domain) => {
		const clean = String(domain || "")
			.trim()
			.toLowerCase()
			.replace(/^\*\./, "");
		if (!isValidDomain(clean)) {
			return null;
		}

		const hash = crypto.createHash("sha256").update(clean).digest("hex");

		if (cache.has(hash)) {
			return cache.get(hash);
		}

		const onDisk = await readCached(hash);
		if (onDisk) {
			cache.set(hash, onDisk);
			return onDisk;
		}

		const negativeAt = negativeCache.get(clean);
		if (negativeAt && Date.now() - negativeAt < NEGATIVE_TTL) {
			return null;
		}

		if (inflight.has(hash)) {
			return inflight.get(hash);
		}

		const promise = (async () => {
			try {
				const result = await fetchFavicon(clean);
				if (!result) {
					negativeCache.set(clean, Date.now());
					return null;
				}
				try {
					await mkdir(CACHE_DIR, { recursive: true });
					await writeFile(`${CACHE_DIR}/${hash}.${result.ext}`, result.buffer);
				} catch (err) {
					// Caching to disk failed (e.g. read-only dev) - still serve this request.
					logger.error(`Error caching favicon for ${clean}: ${err.message}`);
				}
				const value = { buffer: result.buffer, contentType: result.contentType };
				cache.set(hash, value);
				return value;
			} catch (err) {
				logger.error(`Error downloading favicon for ${clean}: ${err.message}`);
				negativeCache.set(clean, Date.now());
				return null;
			} finally {
				inflight.delete(hash);
			}
		})();

		inflight.set(hash, promise);
		return promise;
	},

	BROWSER_MAX_AGE,
};

export default internalFavicon;
