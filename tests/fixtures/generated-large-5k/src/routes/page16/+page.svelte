<script lang="ts">
	import { page } from "$app/stores";
	import Component16 from "../lib/components/Component16.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 16</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component16 prop0_16="val0" prop1_16="val1" prop2_16="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
