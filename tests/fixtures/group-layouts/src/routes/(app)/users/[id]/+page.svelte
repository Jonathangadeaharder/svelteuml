<script lang="ts">
import UserProfile from "$lib/components/UserProfile.svelte";
let { data } = $props();
</script>

<UserProfile userId={data.params.id} />
