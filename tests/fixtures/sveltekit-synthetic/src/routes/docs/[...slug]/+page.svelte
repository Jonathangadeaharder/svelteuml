<script lang="ts">
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
</script>

<h1>Docs</h1>
<p>Slug: {data.slug?.join("/")}</p>
