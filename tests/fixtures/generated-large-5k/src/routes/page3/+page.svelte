<script lang="ts">
	import { page } from "$app/stores";
	import Component3 from "../lib/components/Component3.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 3</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component3 prop0_3="val0" prop1_3="val1" prop2_3="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
