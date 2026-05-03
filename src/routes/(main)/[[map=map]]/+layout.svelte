<script lang="ts">
	import Metadata from "@/components/utils/Metadata.svelte";

	let { children } = $props();
</script>

<Metadata />

{@render children?.()}
