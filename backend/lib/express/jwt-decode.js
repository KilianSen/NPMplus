import internalApiToken from "../../internal/api-token.js";
import TokenModel from "../../models/token.js";
import Access from "../access.js";

export default () => {
	return async (req, res, next) => {
		let token = req.signedCookies?.["__Host-Http-token"] || null;

		// If there is no session cookie, allow authentication via an opaque API token
		// supplied as `Authorization: Bearer npmplus_...`. This is the path used by the
		// SDK and other external (non-browser) clients. The opaque secret is resolved to
		// its owning user, and a short-lived internal token is minted so the rest of the
		// access pipeline (roles, permissions, object scoping) behaves identically to a
		// normal user session.
		if (!token) {
			const authHeader = req.headers?.authorization;
			if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
				const secret = authHeader.substring("Bearer ".length).trim();
				const userId = await internalApiToken.resolveSecret(secret);
				if (userId) {
					const signed = await TokenModel().create({
						iss: "api",
						attrs: { id: userId },
						scope: ["user"],
						expiresIn: "5m",
					});
					token = signed.token;
				}
			}
		}

		try {
			res.locals.access = null;
			const access = new Access(token);
			await access.load();
			res.locals.access = access;
			next();
		} catch {
			res.clearCookie("__Host-Http-token", {
				httpOnly: true,
				secure: true,
				sameSite: "Strict",
			});
			return res.status(403).json({
				error: {
					message: "Invalid or expired token",
				},
			});
		}
	};
};
