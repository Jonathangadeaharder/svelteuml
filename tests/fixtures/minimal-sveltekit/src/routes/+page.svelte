<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { userStore } from '$lib/stores/user';

	let count = $state(0);
	const doubled = $derived(count * 2);

	function increment() {
		count++;
	}
</script>

<h1>Home</h1>
<p>Count: {count}, Doubled: {doubled}</p>
<Button label="Click me" onClick={increment} />
<p>User: {$userStore?.name ?? 'Guest'}</p>
