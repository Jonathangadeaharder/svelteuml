<script lang="ts">
let _email = $state("");
let _password = $state("");
</script>

<form>
	<input type="email" bind:value={email} />
	<input type="password" bind:value={password} />
	<button type="submit">Login</button>
</form>
