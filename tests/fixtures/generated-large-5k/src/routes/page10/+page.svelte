<script lang="ts">
	import { page } from "$app/stores";
	import Component10 from "../lib/components/Component10.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 10</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component10 prop0_10="val0" prop1_10="val1" prop2_10="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
