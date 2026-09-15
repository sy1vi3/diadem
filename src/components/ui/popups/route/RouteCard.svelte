<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getIconForMap } from "$lib/services/uicons.svelte";
	import { getMap } from "@/lib/map/map.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getPopupFitPadding } from "@/lib/mapObjects/popupVisibility.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { formatDistance, formatDuration } from "@/lib/utils/numberFormat";
	import { getRouteBounds, getRouteEndpointFort } from "@/lib/utils/routeUtils";
	import type { LucideIcon } from "@/lib/types/lucide";
	import { ChevronDown, Clock, MapPinned, Ruler } from "@lucide/svelte";

	let {
		route,
		originFortId = undefined
	}: {
		route: RouteData;
		originFortId?: string;
	} = $props();

	let reverseDirection = $derived(route.reversible && originFortId === route.end.id);
	let end = $derived(reverseDirection ? route.start : route.end);
	let endName = $derived(
		end.name ?? (end.type === MapObjectType.GYM ? m.unknown_gym() : m.unknown_pokestop())
	);
	let endFort = $derived(getRouteEndpointFort([route], end.id));
	let endImage = $derived(end.image || (endFort ? getIconForMap(endFort) : undefined));

	let routeMetrics: { Icon: LucideIcon; title: string; value: string }[] = $derived([
		{
			Icon: Ruler,
			title: m.route_distance(),
			value: formatDistance(route.distance_meters)
		},
		{
			Icon: Clock,
			title: m.route_duration(),
			value: formatDuration(route.duration_seconds)
		}
	]);

	function fitRoute() {
		const map = getMap();
		if (!map) return;
		map.fitBounds(getRouteBounds(route), { padding: getPopupFitPadding(), maxZoom: 17 });
	}

	function showRoutePopup() {
		openPopup(route);
		fitRoute();
	}
</script>

<details class="group">
	<summary
		class="flex cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
	>
		{#if endImage}
			<ImagePopup src={endImage} alt={endName} class="size-10 shrink-0 rounded-full object-cover" />
		{:else}<MapPinned class="size-8 shrink-0 text-muted-foreground" />{/if}
		<span class="min-w-0 flex-1">
			<span class="block break-words font-medium">{route.name || m.unknown_route()}</span>
			<span class="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
				{#each routeMetrics as { Icon, title, value } (title)}<span
						class="inline-flex items-center gap-1"
						{title}><Icon class="size-3" />{value}</span
					>{/each}
			</span>
		</span>
		<ChevronDown
			class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
		/>
	</summary>
	<div class="border-t border-border px-4 py-3">
		<p class="text-xs text-muted-foreground">{m.route_leads_to()}</p>
		<p class="break-words text-sm font-medium">{endName}</p>
		<Button variant="link" size="sm" class="mt-2 px-0!" onclick={showRoutePopup}
			><MapPinned class="size-3.5" />{m.show_route()}</Button
		>
	</div>
</details>
