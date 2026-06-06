import { IconAdjustments, IconCheck } from "@tabler/icons-react";
import { intl } from "src/locale";
import type { ViewDefinition } from "./types";

interface Props<T> {
	views: ViewDefinition<T, any>[];
	activeView: ViewDefinition<T, any>;
	onSelect: (id: string) => void;
	config: Record<string, unknown>;
	onConfigChange: (config: Record<string, unknown>) => void;
}

/** The shared view picker + per-view configuration gear shown in a list's header. */
export function DataViewControls<T>({ views, activeView, onSelect, config, onConfigChange }: Props<T>) {
	const ConfigPanel = activeView.ConfigPanel;
	return (
		<div className="btn-list">
			{views.length > 1 ? (
				<div className="dropdown">
					<button
						type="button"
						className="btn btn-sm dropdown-toggle"
						data-bs-toggle="dropdown"
						title={intl.formatMessage({ id: "view.label" })}
					>
						{activeView.icon}
						<span className="ms-1">{intl.formatMessage({ id: activeView.label })}</span>
					</button>
					<div className="dropdown-menu">
						{views.map((view) => (
							<button
								key={view.id}
								type="button"
								className={`dropdown-item ${view.id === activeView.id ? "active" : ""}`}
								onClick={() => onSelect(view.id)}
							>
								<span className="me-2">{view.icon}</span>
								{intl.formatMessage({ id: view.label })}
								{view.id === activeView.id ? <IconCheck size={16} className="ms-auto" /> : null}
							</button>
						))}
					</div>
				</div>
			) : null}
			{ConfigPanel ? (
				<div className="dropdown">
					<button
						type="button"
						className="btn btn-sm btn-icon"
						data-bs-toggle="dropdown"
						data-bs-auto-close="outside"
						title={intl.formatMessage({ id: "view.settings" })}
						aria-label={intl.formatMessage({ id: "view.settings" })}
					>
						<IconAdjustments size={18} />
					</button>
					<div className="dropdown-menu dropdown-menu-end p-3" style={{ minWidth: "16rem" }}>
						<ConfigPanel config={config} onChange={onConfigChange} />
					</div>
				</div>
			) : null}
		</div>
	);
}
