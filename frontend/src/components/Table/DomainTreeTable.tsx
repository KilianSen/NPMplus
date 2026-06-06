import { IconChevronDown, IconChevronRight, IconFolder } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { T } from "src/locale";
import { buildDomainTree, countHosts, type DomainTreeNode, sortedEntries } from "src/modules/domainTree";
import { DomainsFormatter } from "./Formatter";

interface DomainTreeTableProps<T> {
	data: T[];
	getDomains: (item: T) => string[];
	getCreatedOn?: (item: T) => string | undefined;
	getRowKey: (item: T) => string | number;
	/** Type-specific cells shown next to a host (destination, ssl, status, …). */
	renderDetail: (item: T) => ReactNode;
	/** The host actions dropdown. */
	renderActions: (item: T) => ReactNode;
	/** Accent color for the host-count badge (matches the list, e.g. "lime"). */
	color?: string;
	/** Folders at a render-depth >= this start collapsed (top-level folders are depth 0). */
	expandDepth?: number;
}

const INDENT_REM = 1.5;
const CHEVRON_WIDTH = "1.5rem";
const ALL_DEPTHS = 99;

/**
 * Renders hosts as a collapsible, multi-level tree grouped by domain hierarchy
 * (TLD at the root). The flat table is rendered separately; this is the grouped
 * view. The tree structure is computed by the pure helpers in modules/domainTree.
 */
export function DomainTreeTable<T>({
	data,
	getDomains,
	getCreatedOn,
	getRowKey,
	renderDetail,
	renderActions,
	color,
	expandDepth = ALL_DEPTHS,
}: DomainTreeTableProps<T>) {
	const root = buildDomainTree(data, getDomains);

	// Folders deeper than expandDepth start collapsed.
	const computeCollapsed = () => {
		const set = new Set<string>();
		const walk = (node: DomainTreeNode<T>, depth: number) => {
			for (const child of node.children.values()) {
				if (child.children.size > 0) {
					if (depth >= expandDepth) {
						set.add(child.fullDomain);
					}
					walk(child, depth + 1);
				}
			}
		};
		walk(root, 0);
		return set;
	};

	const [collapsed, setCollapsed] = useState<Set<string>>(computeCollapsed);
	// Re-seed collapse state when the configured depth changes (guarded render-time reset).
	const [appliedDepth, setAppliedDepth] = useState(expandDepth);
	if (appliedDepth !== expandDepth) {
		setAppliedDepth(expandDepth);
		setCollapsed(computeCollapsed());
	}

	const toggle = (fullDomain: string) => {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(fullDomain)) {
				next.delete(fullDomain);
			} else {
				next.add(fullDomain);
			}
			return next;
		});
	};

	const indentStyle = (depth: number) => ({ paddingLeft: `${depth * INDENT_REM}rem` });
	const rows: ReactNode[] = [];

	const pushHostRow = (host: T, depth: number) => {
		rows.push(
			<tr key={`host-${getRowKey(host)}`}>
				<td>
					<div className="d-flex align-items-center" style={indentStyle(depth)}>
						<span className="d-inline-block flex-shrink-0" style={{ width: CHEVRON_WIDTH }} />
						<DomainsFormatter domains={getDomains(host)} createdOn={getCreatedOn?.(host)} />
					</div>
				</td>
				<td>{renderDetail(host)}</td>
				<td className="text-end w-1">{renderActions(host)}</td>
			</tr>,
		);
	};

	const pushGroupRow = (node: DomainTreeNode<T>, depth: number, expanded: boolean) => {
		rows.push(
			<tr key={`group-${node.fullDomain}`}>
				<td>
					<div className="d-flex align-items-center" style={indentStyle(depth)}>
						<button
							type="button"
							className="btn btn-sm btn-ghost-secondary p-0 border-0 flex-shrink-0"
							style={{ width: CHEVRON_WIDTH }}
							onClick={() => toggle(node.fullDomain)}
							aria-expanded={expanded}
						>
							{expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
						</button>
						<IconFolder size={16} className="text-secondary me-2 flex-shrink-0" />
						<span className="fw-bold text-break">{node.fullDomain}</span>
						<span className={`badge ms-2 ${color ? `bg-${color}-lt` : "bg-secondary-lt"}`}>
							<T id="group.host-count" data={{ count: countHosts(node) }} />
						</span>
					</div>
				</td>
				<td />
				<td className="text-end w-1" />
			</tr>,
		);
	};

	const renderNode = (node: DomainTreeNode<T>, depth: number) => {
		for (const entry of sortedEntries(node)) {
			if (entry.kind === "host") {
				pushHostRow(entry.host, depth);
				continue;
			}
			const child = entry.node;
			if (child.children.size > 0) {
				const expanded = !collapsed.has(child.fullDomain);
				pushGroupRow(child, depth, expanded);
				if (expanded) {
					renderNode(child, depth + 1);
				}
			} else {
				for (const host of child.hosts) {
					pushHostRow(host, depth);
				}
			}
		}
	};

	renderNode(root, 0);

	return (
		<div className="table-responsive">
			<table className="table table-vcenter table-selectable mb-0">
				<tbody className="table-tbody">{rows}</tbody>
			</table>
		</div>
	);
}
