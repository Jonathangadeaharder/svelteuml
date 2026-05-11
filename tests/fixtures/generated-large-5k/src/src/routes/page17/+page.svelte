<script lang="ts">
	import { page } from "$app/stores";
	import Component17 from "../lib/components/Component17.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 17</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component17 prop0_17="val0" prop1_17="val1" prop2_17="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
