import { describe, expect, it } from "vitest";
import { buildDomainTree, countHosts, reverseLabels, sortedEntries } from "./domainTree";

interface TestHost {
	id: number;
	domainNames: string[];
}

const getDomains = (h: TestHost) => h.domainNames;
const child = (node: ReturnType<typeof buildDomainTree<TestHost>>, segment: string) => {
	const c = node.children.get(segment);
	if (!c) throw new Error(`missing child "${segment}"`);
	return c;
};

describe("reverseLabels", () => {
	it("orders labels TLD-first", () => {
		expect(reverseLabels("a.b.c")).toEqual(["c", "b", "a"]);
	});
	it("strips a leading wildcard", () => {
		expect(reverseLabels("*.b.c")).toEqual(["c", "b"]);
	});
	it("lowercases and drops empty labels", () => {
		expect(reverseLabels("A.B.C.")).toEqual(["c", "b", "a"]);
	});
	it("handles a single label", () => {
		expect(reverseLabels("localhost")).toEqual(["localhost"]);
	});
});

describe("buildDomainTree", () => {
	it("groups a.b.c, b.c and d.b.c under c -> b.c", () => {
		const hosts: TestHost[] = [
			{ id: 1, domainNames: ["a.b.c"] },
			{ id: 2, domainNames: ["b.c"] },
			{ id: 3, domainNames: ["d.b.c"] },
		];
		const root = buildDomainTree(hosts, getDomains);

		// Single TLD node at the top
		expect([...root.children.keys()]).toEqual(["c"]);
		const c = child(root, "c");
		expect(c.fullDomain).toBe("c");

		const bc = child(c, "b");
		expect(bc.fullDomain).toBe("b.c");
		// b.c holds its own host plus the two subdomains
		expect(bc.hosts.map((h) => h.id)).toEqual([2]);
		expect([...bc.children.keys()].sort()).toEqual(["a", "d"]);
		expect(child(bc, "a").hosts.map((h) => h.id)).toEqual([1]);
		expect(child(bc, "d").hosts.map((h) => h.id)).toEqual([3]);

		expect(countHosts(root)).toBe(3);
		expect(countHosts(bc)).toBe(3);
		expect(countHosts(c)).toBe(3);
	});

	it("places a host under its first (primary) domain", () => {
		const hosts: TestHost[] = [{ id: 1, domainNames: ["a.b.c", "x.y.z"] }];
		const root = buildDomainTree(hosts, getDomains);
		expect([...root.children.keys()]).toEqual(["c"]);
		expect(child(child(child(root, "c"), "b"), "a").hosts.map((h) => h.id)).toEqual([1]);
	});

	it("groups a wildcard host under its base domain", () => {
		const hosts: TestHost[] = [{ id: 1, domainNames: ["*.b.c"] }];
		const root = buildDomainTree(hosts, getDomains);
		const bc = child(child(root, "c"), "b");
		expect(bc.fullDomain).toBe("b.c");
		expect(bc.hosts.map((h) => h.id)).toEqual([1]);
	});

	it("attaches hosts without a domain to the root", () => {
		const hosts: TestHost[] = [{ id: 1, domainNames: [] }];
		const root = buildDomainTree(hosts, getDomains);
		expect(root.hosts.map((h) => h.id)).toEqual([1]);
		expect(root.children.size).toBe(0);
	});

	it("keeps separate TLDs in separate top-level branches", () => {
		const hosts: TestHost[] = [
			{ id: 1, domainNames: ["a.example.com"] },
			{ id: 2, domainNames: ["a.example.org"] },
		];
		const root = buildDomainTree(hosts, getDomains);
		expect([...root.children.keys()].sort()).toEqual(["com", "org"]);
	});
});

describe("sortedEntries", () => {
	it("merges a node's own host with its children sorted by full domain", () => {
		const hosts: TestHost[] = [
			{ id: 1, domainNames: ["a.b.c"] },
			{ id: 2, domainNames: ["b.c"] },
			{ id: 3, domainNames: ["d.b.c"] },
		];
		const root = buildDomainTree(hosts, getDomains);
		const bc = child(child(root, "c"), "b");
		const entries = sortedEntries(bc);
		expect(entries.map((e) => e.fullDomain)).toEqual(["a.b.c", "b.c", "d.b.c"]);
		expect(entries.map((e) => e.kind)).toEqual(["node", "host", "node"]);
	});
});
