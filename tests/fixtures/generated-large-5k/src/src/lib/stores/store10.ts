import { writable, derived } from "svelte/store";

export interface Data10 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore10(initial: Data10) {
	const store = writable<Data10>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore10() {
	return createStore10({ id: 10, name: "item-10", value: 1000, metadata: { type: "auto" } });
}
