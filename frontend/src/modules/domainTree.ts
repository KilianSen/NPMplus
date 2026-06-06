/**
 * Builds a nested tree of hosts grouped by their domain hierarchy, TLD first.
 * e.g. the domains a.b.c, b.c and d.b.c produce: c -> b.c -> { a.b.c, b.c, d.b.c }.
 *
 * This is pure (no React/DOM) so it can be unit tested in isolation.
 */

export interface DomainTreeNode<T> {
	/** The single label at this level (TLD-first), e.g. "b" for the node "b.c". Empty for the virtual root. */
	segment: string;
	/** The full domain this node represents, e.g. "b.c". Empty for the virtual root / the "no domain" bucket. */
	fullDomain: string;
	/** Hosts whose primary (first) domain equals fullDomain. */
	hosts: T[];
	/** Child nodes keyed by their segment. */
	children: Map<string, DomainTreeNode<T>>;
}

/**
 * Split a domain into labels ordered TLD-first: "a.b.c" -> ["c", "b", "a"].
 * A leading wildcard is stripped ("*.b.c" -> ["c", "b"]) and empty labels are dropped.
 */
export function reverseLabels(domain: string): string[] {
	return domain
		.trim()
		.toLowerCase()
		.replace(/^\*\./, "")
		.split(".")
		.filter((label) => label.length > 0)
		.reverse();
}

function createNode<T>(segment: string, fullDomain: string): DomainTreeNode<T> {
	return { segment, fullDomain, hosts: [], children: new Map() };
}

/**
 * Build a domain tree (TLD at the root) from a flat list of items.
 * Each item is placed at the node of its first/primary domain name; items without
 * any domain are attached to the root so they still appear in the grouped view.
 */
export function buildDomainTree<T>(items: T[], getDomains: (item: T) => string[]): DomainTreeNode<T> {
	const root = createNode<T>("", "");
	for (const item of items) {
		const domains = getDomains(item) ?? [];
		const labels = domains.length > 0 ? reverseLabels(domains[0]) : [];
		if (labels.length === 0) {
			root.hosts.push(item);
			continue;
		}
		let cur = root;
		const acc: string[] = [];
		for (const label of labels) {
			acc.push(label);
			const fullDomain = [...acc].reverse().join(".");
			let child = cur.children.get(label);
			if (!child) {
				child = createNode<T>(label, fullDomain);
				cur.children.set(label, child);
			}
			cur = child;
		}
		cur.hosts.push(item);
	}
	return root;
}

/** Total number of hosts in a node's subtree, including the node's own hosts. */
export function countHosts<T>(node: DomainTreeNode<T>): number {
	let count = node.hosts.length;
	for (const child of node.children.values()) {
		count += countHosts(child);
	}
	return count;
}

export type DomainTreeEntry<T> =
	| { kind: "host"; fullDomain: string; host: T }
	| { kind: "node"; fullDomain: string; node: DomainTreeNode<T> };

/**
 * Ordered render entries for a node's contents: its attached hosts and its child
 * nodes merged into a single list sorted by full domain. This lets a host whose
 * domain is exactly the group domain (e.g. "b.c") sort naturally among its siblings.
 */
export function sortedEntries<T>(node: DomainTreeNode<T>): DomainTreeEntry<T>[] {
	const entries: DomainTreeEntry<T>[] = [];
	for (const host of node.hosts) {
		entries.push({ kind: "host", fullDomain: node.fullDomain, host });
	}
	for (const child of node.children.values()) {
		entries.push({ kind: "node", fullDomain: child.fullDomain, node: child });
	}
	entries.sort((a, b) => a.fullDomain.localeCompare(b.fullDomain));
	return entries;
}
