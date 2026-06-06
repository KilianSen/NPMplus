import type { ReactNode } from "react";
import { DataViewControls } from "./DataViewControls";
import type { ViewDefinition } from "./types";
import { usePersistentState } from "./usePersistentState";

interface UseDataViewArgs<T> {
	/** Stable key for persisting the selected view + config, e.g. "proxy-hosts". */
	screenKey: string;
	data: T[];
	views: ViewDefinition<T, any>[];
}

/**
 * Shared list-visualization framework. Given the available views for a screen, it
 * persists the selected view and each view's configuration, and returns:
 *  - `controls`: the view picker + config gear (null when there's nothing to choose)
 *  - `content`: the active view's rendered output
 */
export function useDataView<T>({ screenKey, data, views }: UseDataViewArgs<T>): {
	controls: ReactNode;
	content: ReactNode;
} {
	const [selectedId, setSelectedId] = usePersistentState<string>(`data-view:${screenKey}`, views[0]?.id ?? "");
	const [allConfigs, setAllConfigs] = usePersistentState<Record<string, Record<string, unknown>>>(
		`data-view-config:${screenKey}`,
		{},
	);

	const activeView = views.find((v) => v.id === selectedId) ?? views[0];
	if (!activeView) {
		return { controls: null, content: null };
	}

	const config = { ...(activeView.defaultConfig ?? {}), ...(allConfigs[activeView.id] ?? {}) };
	const onConfigChange = (next: Record<string, unknown>) => setAllConfigs({ ...allConfigs, [activeView.id]: next });

	const hasConfig = typeof activeView.ConfigPanel === "function";
	const controls =
		views.length > 1 || hasConfig ? (
			<DataViewControls
				views={views}
				activeView={activeView}
				onSelect={setSelectedId}
				config={config}
				onConfigChange={onConfigChange}
			/>
		) : null;

	const content = activeView.render({ data, config: config as any });

	return { controls, content };
}
