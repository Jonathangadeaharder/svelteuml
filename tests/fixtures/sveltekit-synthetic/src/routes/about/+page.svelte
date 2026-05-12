<script lang="ts">
import { formatDate } from "$lib/utils/format";

const created = formatDate(new Date());
</script>

<h1>About</h1>
<p>Created: {created}</p>
