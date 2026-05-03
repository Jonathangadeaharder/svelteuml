<script lang="ts">
let count = $state(0);
const _doubled = $derived(count * 2);

function _increment() {
	count++;
}
</script>

<h1>Home</h1>
<p>Count: {count}, Doubled: {doubled}</p>
<Button label="Click me" onClick={increment} />
<p>User: {$userStore?.name ?? 'Guest'}</p>
