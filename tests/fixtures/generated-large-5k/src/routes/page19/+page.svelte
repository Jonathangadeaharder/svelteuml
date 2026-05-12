<script lang="ts">
	import { page } from "$app/stores";
	import Component19 from "../lib/components/Component19.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 19</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component19 prop0_19="val0" prop1_19="val1" prop2_19="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
