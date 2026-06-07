<script lang="ts">
	import WeatherOverview from "@/components/map/WeatherOverview.svelte";
	import Fabs from "@/components/ui/fab/Fabs.svelte";
	import DebugMenu from "@/components/map/DebugMenu.svelte";
	import { isMenuSidebar, isUiLeft } from "@/lib/utils/device";
	import { isSearchViewActive } from "@/lib/features/activeSearch.svelte";
	import type maplibre from "maplibre-gl";

	let { map }: { map: maplibre.Map | undefined } = $props();

	let right = $derived(!isUiLeft() || isMenuSidebar());
</script>

<div
	class="pointer-events-none fixed top-2 z-20 flex flex-col gap-2"
	class:right-0={right}
	class:items-end={right}
	class:left-0={!right}
	class:items-start={!right}
>
	<WeatherOverview />

	{#if !isSearchViewActive()}
		<Fabs {map} allowFollow={true} />
	{/if}

	<DebugMenu />
</div>
