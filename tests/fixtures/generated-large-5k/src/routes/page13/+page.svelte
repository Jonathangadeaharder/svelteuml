<script lang="ts">
	import { page } from "$app/stores";
	import Component13 from "../lib/components/Component13.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 13</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component13 prop0_13="val0" prop1_13="val1" prop2_13="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
