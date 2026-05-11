import { writable, derived } from "svelte/store";

export interface Data5 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore5(initial: Data5) {
	const store = writable<Data5>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore5() {
	return createStore5({ id: 5, name: "item-5", value: 500, metadata: { type: "auto" } });
}
