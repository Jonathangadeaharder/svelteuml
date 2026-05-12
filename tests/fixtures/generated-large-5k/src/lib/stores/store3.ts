import { writable, derived } from "svelte/store";

export interface Data3 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore3(initial: Data3) {
	const store = writable<Data3>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore3() {
	return createStore3({ id: 3, name: "item-3", value: 300, metadata: { type: "auto" } });
}
