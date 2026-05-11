<script lang="ts">
	import { page } from "$app/stores";
	import Component2 from "../lib/components/Component2.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 2</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component2 prop0_2="val0" prop1_2="val1" prop2_2="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
