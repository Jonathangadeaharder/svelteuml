<script lang="ts">
let _stats = $state({ users: 0, active: 0 });
</script>

<h1>Dashboard</h1>
<p>Total users: {stats.users}</p>
<p>Active: {stats.active}</p>
