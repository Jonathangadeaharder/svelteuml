<script lang="ts">
import { createEventDispatcher } from "svelte";

let {
	variant = "primary",
	disabled = false,
	label,
}: {
	variant?: "primary" | "secondary";
	disabled?: boolean;
	label: string;
} = $props();

const dispatch = createEventDispatcher<{ click: MouseEvent }>();

function handleClick(e: MouseEvent) {
	if (!disabled) {
		dispatch("click", e);
	}
}
</script>

<button class={variant} {disabled} onclick={handleClick}>
	{label}
</button>
