import type { ReactNode } from "react";

export interface ViewConfigPanelProps<C> {
	config: C;
	onChange: (config: C) => void;
}

/**
 * A single way of visualizing a list of items (flat table, grouped tree, map, …).
 * Screens expose an array of these; the shared DataView UI handles picking between
 * them and editing their configuration. Adding a new visualization = one ViewDefinition.
 */
export interface ViewDefinition<T, C = Record<string, never>> {
	/** Stable id, persisted as the selected view (e.g. "flat", "grouped"). */
	id: string;
	/** i18n id for the label shown in the picker. */
	label: string;
	icon: ReactNode;
	/** Default configuration; merged with the persisted per-view config. */
	defaultConfig?: C;
	/** Renders the view for the given data and (resolved) config. */
	render: (args: { data: T[]; config: C }) => ReactNode;
	/** Optional configuration UI, shown behind a gear button when this view is active. */
	ConfigPanel?: (props: ViewConfigPanelProps<C>) => ReactNode;
}
