<script lang="ts">
let { status, error } = $props();
</script>

<h1>{status}</h1>
<p>{error?.message}</p>
