import { writable, derived } from "svelte/store";

export interface Data2 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore2(initial: Data2) {
	const store = writable<Data2>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore2() {
	return createStore2({ id: 2, name: "item-2", value: 200, metadata: { type: "auto" } });
}
