import { writable, derived } from "svelte/store";

export interface Data7 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore7(initial: Data7) {
	const store = writable<Data7>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore7() {
	return createStore7({ id: 7, name: "item-7", value: 700, metadata: { type: "auto" } });
}
