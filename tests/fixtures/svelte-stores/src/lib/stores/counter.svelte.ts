import { counter } from './counter.svelte.js';

export function useCounters() {
	const count = counter(0);
	const doubled = counter(0);

	function increment() {
		count.value++;
		doubled.value = count.value * 2;
	}

	return { count, doubled, increment };
}
