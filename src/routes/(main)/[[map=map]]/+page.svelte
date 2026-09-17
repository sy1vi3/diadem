<script lang="ts">
	import Home from "@/components/custom/Home.svelte";
	import { isOnMap } from "@/lib/utils/getMapPath";
</script>

{#if !isOnMap()}
	<Home />
{:else}
	{#await import("@/components/map/MapPage.svelte") then { default: MapPage }}
		<MapPage />
	{/await}
{/if}
