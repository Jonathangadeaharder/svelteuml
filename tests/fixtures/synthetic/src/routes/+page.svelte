<script lang="ts">
import Button from "$lib/components/Button.svelte";
import Card from "$lib/components/Card.svelte";
import { count, doubleCount, reset } from "$lib/stores/counter";
import { greet, formatPrice } from "$lib/utils";

function handleClick() {
	count.update((n) => n + 1);
}
</script>

<h1>{greet("World")}</h1>
<p>Count: {$count}</p>
<p>Double: {$doubleCount}</p>
<p>Price: {formatPrice(19.99)}</p>

<Button label="Increment" onclick={handleClick} />
<Button label="Decrement" variant="secondary" onclick={() => count.update((n) => n - 1)} />

<Card title="Dashboard">
	<p>Welcome to the dashboard</p>
	{#snippet footer()}
		<Button label="Reset" onclick={reset} />
	{/snippet}
</Card>
