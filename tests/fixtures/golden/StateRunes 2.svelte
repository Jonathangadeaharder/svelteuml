<script lang="ts">
let count = $state(0);
let doubled = $derived(count * 2);

function increment() {
	count += 1;
}
</script>

<button onclick={increment}>Count: {count}</button>
<p>Doubled: {doubled}</p>
