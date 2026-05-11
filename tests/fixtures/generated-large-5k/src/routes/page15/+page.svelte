<script lang="ts">
	import { page } from "$app/stores";
	import Component15 from "../lib/components/Component15.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 15</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component15 prop0_15="val0" prop1_15="val1" prop2_15="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
