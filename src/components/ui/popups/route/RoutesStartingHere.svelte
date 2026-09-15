<script lang="ts">
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import RouteCard from "@/components/ui/popups/route/RouteCard.svelte";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import * as m from "@/lib/paraglide/messages";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { Features } from "@/lib/utils/features";
	import { routeStartsAt } from "@/lib/utils/routeUtils";
	import { Signpost } from "@lucide/svelte";

	let { fortId }: { fortId: string } = $props();
	let routes = $derived(
		Object.values(getMapObjects())
			.filter(
				(object): object is RouteData =>
					object.type === MapObjectType.ROUTE && routeStartsAt(object, fortId)
			)
			.sort((a, b) => a.name.localeCompare(b.name))
	);
</script>

{#if routes.length > 0 && hasFeatureAnywhere(getUserDetails().permissions, Features.ROUTE)}
	<TitledMainSection Icon={Signpost} title={m.routes_from_here()}>
		{#key fortId}
			<div class="divide-y divide-border overflow-hidden rounded-lg border border-border">
				{#each routes as route (route.mapId)}
					<RouteCard {route} originFortId={fortId} />
				{/each}
			</div>
		{/key}
	</TitledMainSection>
{/if}
