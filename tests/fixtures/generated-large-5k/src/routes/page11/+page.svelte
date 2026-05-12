<script lang="ts">
	import { page } from "$app/stores";
	import Component11 from "../lib/components/Component11.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 11</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component11 prop0_11="val0" prop1_11="val1" prop2_11="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
