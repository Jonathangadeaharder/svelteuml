<script lang="ts">
import Card from "$lib/components/Card.svelte";
import Header from "$lib/components/Header.svelte";
import { cart } from "$lib/stores/cart.svelte";
import { products } from "$lib/stores/products";

let title = $state("Welcome");
let count = $state(0);
const doubled = $derived(count * 2);

function increment() {
	count++;
}
</script>

<Header {title} />
<h1>{title}</h1>
<p>Count: {count}, Doubled: {doubled}</p>
<button onclick={increment}>+1</button>
<Card label="Home" />
<p>Cart items: {$cart.length}</p>
<p>Products: {$products.length}</p>
