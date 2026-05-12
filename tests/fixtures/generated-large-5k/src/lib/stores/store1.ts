import { writable, derived } from "svelte/store";

export interface Data1 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore1(initial: Data1) {
	const store = writable<Data1>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore1() {
	return createStore1({ id: 1, name: "item-1", value: 100, metadata: { type: "auto" } });
}
