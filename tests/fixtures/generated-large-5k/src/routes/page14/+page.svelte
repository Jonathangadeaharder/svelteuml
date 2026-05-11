<script lang="ts">
	import { page } from "$app/stores";
	import Component14 from "../lib/components/Component14.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 14</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component14 prop0_14="val0" prop1_14="val1" prop2_14="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
