<script lang="ts">
	let username = $state('');
	let email = $state('');
	let password = $state('');
	const isValid = $derived(username.length > 0 && email.includes('@') && password.length >= 8);
</script>

<form>
	<input bind:value={username} placeholder="Username" />
	<input type="email" bind:value={email} />
	<input type="password" bind:value={password} />
	<button type="submit" disabled={!isValid}>Register</button>
</form>
