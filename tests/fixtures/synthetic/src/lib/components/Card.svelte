<script lang="ts">
import type { Snippet } from "svelte";
import Button from "./Button.svelte";

let {
	title,
	children,
	footer,
}: {
	title: string;
	children: Snippet;
	footer?: Snippet;
} = $props();
</script>

<div class="card">
	<h2>{title}</h2>
	<div class="content">
		{@render children()}
	</div>
	{#if footer}
		<div class="footer">
			{@render footer()}
		</div>
	{/if}
</div>
