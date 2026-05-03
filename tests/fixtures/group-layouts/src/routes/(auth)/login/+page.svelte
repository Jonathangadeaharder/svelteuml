<script lang="ts">
let email = $state("");
let password = $state("");
</script>

<form>
	<input type="email" bind:value={email} />
	<input type="password" bind:value={password} />
	<button type="submit">Login</button>
</form>
