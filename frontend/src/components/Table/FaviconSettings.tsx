import { IconWorld } from "@tabler/icons-react";
import { usePersistentState } from "src/components/DataView";
import { intl } from "src/locale";

export interface FaviconSettings {
	/** Show the host's site favicon instead of the creator's avatar in the owner column. */
	ownerFavicon: boolean;
	/** Show a small favicon next to each domain name. */
	domainFavicon: boolean;
}

const DEFAULT_SETTINGS: FaviconSettings = { ownerFavicon: false, domainFavicon: false };

/** Per-screen favicon display preferences, persisted in localStorage. */
export function useFaviconSettings(screenKey: string): [FaviconSettings, (settings: FaviconSettings) => void] {
	return usePersistentState<FaviconSettings>(`favicon-settings:${screenKey}`, DEFAULT_SETTINGS);
}

/** Header control: a gear dropdown with switches for the favicon display options. */
export function FaviconSettingsControl({
	settings,
	onChange,
}: {
	settings: FaviconSettings;
	onChange: (settings: FaviconSettings) => void;
}) {
	return (
		<div className="dropdown">
			<button
				type="button"
				className="btn btn-sm btn-icon"
				data-bs-toggle="dropdown"
				data-bs-auto-close="outside"
				title={intl.formatMessage({ id: "favicon.settings" })}
				aria-label={intl.formatMessage({ id: "favicon.settings" })}
			>
				<IconWorld size={18} />
			</button>
			<div className="dropdown-menu dropdown-menu-end p-3" style={{ minWidth: "18rem" }}>
				<label className="form-check form-check-single form-switch mb-2">
					<input
						className="form-check-input"
						type="checkbox"
						checked={settings.ownerFavicon}
						onChange={(e) => onChange({ ...settings, ownerFavicon: e.target.checked })}
					/>
					<span className="form-check-label">{intl.formatMessage({ id: "favicon.owner" })}</span>
				</label>
				<label className="form-check form-check-single form-switch">
					<input
						className="form-check-input"
						type="checkbox"
						checked={settings.domainFavicon}
						onChange={(e) => onChange({ ...settings, domainFavicon: e.target.checked })}
					/>
					<span className="form-check-label">{intl.formatMessage({ id: "favicon.domains" })}</span>
				</label>
			</div>
		</div>
	);
}
