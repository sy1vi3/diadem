<script module lang="ts">
	import { getConfig } from "$lib/services/config/config";
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import BigExpireTime from "@/components/ui/popups/common/BigExpireTime.svelte";
	import { getIconTappable } from "$lib/services/uicons.svelte";
	import { CircleDot } from "@lucide/svelte";
	import type { TappableData } from "$lib/types/mapObjectData/tappable";
	import { getTappableName } from "$lib/utils/tappableUtils";
	import { hasTimer } from "$lib/utils/pokemonUtils";
	import { resize } from "$lib/services/assets";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";

	export { image, headerDetails, main };

	export function getPopupPropsTappable(data: MapData) {
		data = data as TappableData;
		return {
			type: m.pogo_tappable(),
			title: getTappableName(data),
			image,
			headerDetails,
			main
		} as MapObjectPopupProps;
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as TappableData}
	<div class="size-14 shrink-0">
		<ImagePopup alt={getTappableName(data)} src={getIconTappable(data)} class="w-12 h-12" />
	</div>
{/snippet}

{#snippet headerDetails(d: MapData)}
	{@const data = d as TappableData}
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
		<span class="text-muted-foreground">{hasTimer(data) ? m.disappear_time() : m.last_seen()}</span>
		<BigExpireTime expire={hasTimer(data) ? (data.expire_timestamp ?? undefined) : data.updated} />
	</div>
	{#if !hasTimer(data)}
		<p class="mt-1 text-xs text-muted-foreground">{m.unknown_spawnpoint_notice()}</p>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as TappableData}

	{#if getConfig().general.showAccessMaps !== false}
		<TitledMainSection Icon={CircleDot} title={m.access_this_tappable()}>
			<MainAccessMap
				lat={data.lat}
				lon={data.lon}
				type={MapObjectType.TAPPABLE}
				uiconType="tappable"
				radius={40}
				zoom={16.5}
				icon={resize(getIconTappable(data), { width: 64 })}
			/>
		</TitledMainSection>
	{/if}
{/snippet}
