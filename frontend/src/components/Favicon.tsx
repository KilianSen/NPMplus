import { useState } from "react";

const defaultAvatar = "/images/default-avatar.jpg";

/**
 * Pick the domain to fetch a favicon for: the first non-wildcard domain, with a
 * leading "*." stripped. Returns null when there's no usable domain (e.g. streams).
 */
export function faviconDomain(domains: string[] | undefined): string | null {
	if (!domains) {
		return null;
	}
	for (const raw of domains) {
		const clean = raw.trim().toLowerCase().replace(/^\*\./, "");
		if (clean && !clean.includes("*")) {
			return clean;
		}
	}
	return null;
}

// Served same-origin by the backend (which caches the remote favicon); a direct
// cross-origin https://<domain>/favicon.ico is blocked by the app's img-src CSP.
const faviconUrl = (domain: string) => `/api/favicon/${encodeURIComponent(domain)}`;

/**
 * Owner-column icon: shows the host's site favicon when `favicon` is set, falling
 * back to the creator's gravatar (matching GravatarFormatter) if the favicon is
 * absent or fails to load.
 */
export function OwnerAvatar({
	favicon,
	avatarUrl,
	name,
}: {
	favicon: string | null;
	avatarUrl?: string;
	name?: string;
}) {
	const [failed, setFailed] = useState(false);
	const showFavicon = favicon && !failed;
	return (
		<div className="d-flex py-1 align-items-center">
			{showFavicon ? (
				<img
					className="avatar avatar-2 me-2"
					src={faviconUrl(favicon)}
					alt=""
					title={name}
					onError={() => setFailed(true)}
				/>
			) : (
				<span
					title={name}
					className="avatar avatar-2 me-2"
					style={{ backgroundImage: `url(${avatarUrl || defaultAvatar})` }}
				/>
			)}
		</div>
	);
}

/** A small favicon shown inline next to a domain name; renders nothing if it fails. */
export function InlineFavicon({ domain }: { domain: string }) {
	const [failed, setFailed] = useState(false);
	const clean = domain.trim().toLowerCase().replace(/^\*\./, "");
	if (failed || !clean || clean.includes("*")) {
		return null;
	}
	return (
		<img
			src={faviconUrl(clean)}
			alt=""
			width={16}
			height={16}
			className="me-1"
			style={{ verticalAlign: "text-bottom", objectFit: "contain" }}
			onError={() => setFailed(true)}
		/>
	);
}
