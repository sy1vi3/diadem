<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import AccessRouteMap from "@/components/ui/popups/route/AccessRouteMap.svelte";
	import RouteEndpointCard from "@/components/ui/popups/route/RouteEndpointCard.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { formatElevation } from "@/lib/utils/numberFormat";
	import { ArrowLeftRight, Signpost, TrendingDown, TrendingUp } from "@lucide/svelte";

	let { route }: { route: RouteData } = $props();
	let reversed = $state(false);
</script>

<TitledMainSection Icon={Signpost} title={m.follow_this_route()}>
	<BasicMainCard class="w-full divide-y divide-border p-0!">
		<RouteEndpointCard {route} endpoint={reversed ? "end" : "start"} label="start" />
		<RouteEndpointCard {route} endpoint={reversed ? "start" : "end"} label="end" />
	</BasicMainCard>

	<div class="my-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
		<span class="inline-flex items-center gap-1" title={m.route_uphill()}
			><TrendingUp class="size-4" />{formatElevation(
				reversed ? route.elevation_downhill_meters : route.elevation_uphill_meters
			)}</span
		>
		<span class="inline-flex items-center gap-1" title={m.route_downhill()}
			><TrendingDown class="size-4" />{formatElevation(
				reversed ? route.elevation_uphill_meters : route.elevation_downhill_meters
			)}</span
		>
		{#if route.reversible}
			<Button
				size="sm"
				variant="ghost"
				aria-pressed={reversed}
				onclick={() => (reversed = !reversed)}
				><ArrowLeftRight class="size-3.5" />{m.route_reverse_direction()}</Button
			>
		{/if}
	</div>

	<AccessRouteMap {route} />
</TitledMainSection>
