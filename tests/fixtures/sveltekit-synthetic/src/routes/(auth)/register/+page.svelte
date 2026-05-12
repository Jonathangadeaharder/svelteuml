<script lang="ts">
let name = $state("");
let email = $state("");

function handleSubmit() {}
</script>

<form onsubmit={handleSubmit}>
	<input type="text" bind:value={name} />
	<input type="email" bind:value={email} />
	<button type="submit">Register</button>
</form>
