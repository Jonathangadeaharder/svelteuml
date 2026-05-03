<script lang="ts">
let email = $state("");
let password = $state("");

function handleSubmit() {}
</script>

<form onsubmit={handleSubmit}>
	<input type="email" bind:value={email} placeholder="Email" />
	<input type="password" bind:value={password} placeholder="Password" />
	<button type="submit">Login</button>
</form>
