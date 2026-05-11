import { writable, derived } from "svelte/store";

export interface Data9 {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore9(initial: Data9) {
	const store = writable<Data9>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore9() {
	return createStore9({ id: 9, name: "item-9", value: 900, metadata: { type: "auto" } });
}
