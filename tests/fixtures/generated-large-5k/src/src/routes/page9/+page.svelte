<script lang="ts">
	import { page } from "$app/stores";
	import Component9 from "../lib/components/Component9.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 9</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component9 prop0_9="val0" prop1_9="val1" prop2_9="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
