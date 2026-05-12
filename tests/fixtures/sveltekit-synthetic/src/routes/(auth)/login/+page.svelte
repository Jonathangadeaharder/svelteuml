<script lang="ts">
let email = $state("");
let password = $state("");

function handleSubmit() {}
</script>

<form onsubmit={handleSubmit}>
	<input type="email" bind:value={email} />
	<input type="password" bind:value={password} />
	<button type="submit">Login</button>
</form>
