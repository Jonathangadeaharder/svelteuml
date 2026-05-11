import { writable, derived } from "svelte/store";

export interface Data8 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore8(initial: Data8) {
	const store = writable<Data8>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore8() {
	return createStore8({ id: 8, name: "item-8", value: 800, metadata: { type: "auto" } });
}
