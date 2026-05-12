<script lang="ts">
import type { Snippet } from "svelte";

let { items, header, footer }: {
	items: Array<{ id: string; name: string }>;
	header?: Snippet;
	footer?: Snippet;
} = $props();

let selected = $state<string | null>(null);

function select(id: string) {
	selected = id;
}
</script>

{#if header}
	{@render header()}
{/if}

<ul>
	{#each items as item (item.id)}
		<li
			class:selected={selected === item.id}
			onclick={() => select(item.id)}
		>
			{item.name}
		</li>
	{/each}
</ul>

{#if footer}
	{@render footer()}
{/if}

{#if selected}
	<p>Selected: {selected}</p>
{/if}
