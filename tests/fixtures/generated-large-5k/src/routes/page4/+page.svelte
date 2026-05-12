<script lang="ts">
	import { page } from "$app/stores";
	import Component4 from "../lib/components/Component4.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 4</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component4 prop0_4="val0" prop1_4="val1" prop2_4="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
