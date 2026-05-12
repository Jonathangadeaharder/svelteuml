<script lang="ts">
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
</script>

<h1>Product {data.id}</h1>
<p>{data.name}</p>
