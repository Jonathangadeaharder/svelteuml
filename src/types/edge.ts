export type EdgeType =
	| "extends"
	| "implements"
	| "composition"
	| "aggregation"
	| "dependency"
	| "association";

export interface Edge {
	readonly source: string;
	readonly target: string;
	readonly type: EdgeType;
	readonly label?: string;
}

export interface EdgeSet {
	edges: ReadonlyArray<Edge>;
	bySource: Map<string, ReadonlyArray<Edge>>;
	byTarget: Map<string, ReadonlyArray<Edge>>;
}

export function createEdgeSet(edges: ReadonlyArray<Edge>): EdgeSet {
	const bySource = new Map<string, Edge[]>();
	const byTarget = new Map<string, Edge[]>();

	for (const edge of edges) {
		let srcList = bySource.get(edge.source);
		if (!srcList) {
			srcList = [];
			bySource.set(edge.source, srcList);
		}
		srcList.push(edge);

		let tgtList = byTarget.get(edge.target);
		if (!tgtList) {
			tgtList = [];
			byTarget.set(edge.target, tgtList);
		}
		tgtList.push(edge);
	}

	return { edges: [...edges], bySource, byTarget };
}
