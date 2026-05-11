import { writable, derived } from "svelte/store";

export interface Data4 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore4(initial: Data4) {
	const store = writable<Data4>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore4() {
	return createStore4({ id: 4, name: "item-4", value: 400, metadata: { type: "auto" } });
}
