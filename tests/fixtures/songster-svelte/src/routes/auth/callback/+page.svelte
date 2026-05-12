<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	onMount(async () => {
		const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
		if (error) { window.location.replace('/auth/login'); return; }
		window.location.replace('/');
	});
</script>

<p>Redirecting...</p>
