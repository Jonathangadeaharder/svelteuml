<script lang="ts">
	import { page } from "$app/stores";
	import Component5 from "../lib/components/Component5.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 5</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component5 prop0_5="val0" prop1_5="val1" prop2_5="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
