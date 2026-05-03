<script lang="ts">
let _email = $state("");
let _password = $state("");

function _handleSubmit() {}
</script>

<form onsubmit={handleSubmit}>
	<input type="email" bind:value={email} placeholder="Email" />
	<input type="password" bind:value={password} placeholder="Password" />
	<button type="submit">Login</button>
</form>
