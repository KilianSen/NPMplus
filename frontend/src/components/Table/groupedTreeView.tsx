import { IconBinaryTree } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { ViewConfigPanelProps, ViewDefinition } from "src/components/DataView";
import { intl } from "src/locale";
import { DomainTreeTable } from "./DomainTreeTable";

export interface GroupedTreeConfig {
	expandDepth: number;
}

interface GroupedTreeViewArgs<T> {
	getDomains: (item: T) => string[];
	getCreatedOn?: (item: T) => string | undefined;
	getRowKey: (item: T) => string | number;
	renderDetail: (item: T) => ReactNode;
	renderActions: (item: T) => ReactNode;
	color?: string;
}

const EXPAND_ALL = 99;

function GroupedTreeConfigPanel({ config, onChange }: ViewConfigPanelProps<GroupedTreeConfig>) {
	return (
		<label className="form-label mb-0 w-100">
			{intl.formatMessage({ id: "view.expand-depth" })}
			<select
				className="form-select form-select-sm mt-1"
				value={config.expandDepth}
				onChange={(e) => onChange({ ...config, expandDepth: Number(e.target.value) })}
			>
				<option value={1}>1</option>
				<option value={2}>2</option>
				<option value={3}>3</option>
				<option value={EXPAND_ALL}>{intl.formatMessage({ id: "view.expand-all" })}</option>
			</select>
		</label>
	);
}

/**
 * Builds a "grouped by domain" view for a host list: a multi-level collapsible
 * tree (TLD at the root) with a configurable default expand depth. Plug-in for the
 * shared DataView framework — register it in a screen's `views` array.
 */
export function makeGroupedTreeView<T>(args: GroupedTreeViewArgs<T>): ViewDefinition<T, GroupedTreeConfig> {
	return {
		id: "grouped",
		label: "view.grouped",
		icon: <IconBinaryTree size={18} />,
		defaultConfig: { expandDepth: 2 },
		render: ({ data, config }) => (
			<DomainTreeTable
				data={data}
				getDomains={args.getDomains}
				getCreatedOn={args.getCreatedOn}
				getRowKey={args.getRowKey}
				renderDetail={args.renderDetail}
				renderActions={args.renderActions}
				color={args.color}
				expandDepth={config.expandDepth}
			/>
		),
		ConfigPanel: GroupedTreeConfigPanel,
	};
}
