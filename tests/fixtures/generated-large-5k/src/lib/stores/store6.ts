import { writable, derived } from "svelte/store";

export interface Data6 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore6(initial: Data6) {
	const store = writable<Data6>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore6() {
	return createStore6({ id: 6, name: "item-6", value: 600, metadata: { type: "auto" } });
}
