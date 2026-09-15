<script module lang="ts">
	import { getConfig } from "$lib/services/config/config";
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mPokemon } from "$lib/services/ingameLocale";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { formatDecimal, formatNumber, formatPercentage } from "$lib/utils/numberFormat";
	import { CircleDot, CircleSlash2, Info, VectorSquare } from "@lucide/svelte";
	import type { NestData } from "$lib/types/mapObjectData/nest";
	import AccessPolygonMap from "@/components/ui/popups/common/AccessPolygonMap.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import { setActiveSearchPokemon } from "$lib/features/activeSearch.svelte";
	import PokemonStatsCard from "@/components/ui/popups/common/PokemonStatsCard.svelte";

	export { image, headerDetails, main };

	export function getPopupPropsNest(data: MapData) {
		data = data as NestData;
		return {
			type: m.pogo_nest(),
			title: m.pokemon_nest({ pokemon: mPokemon(data) }),
			image,
			headerDetails,
			main
		} as MapObjectPopupProps;
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as NestData}
	<div class="size-14 shrink-0">
		<ImagePopup alt={mPokemon(data)} src={getIconPokemon(data)} class="size-14" />
	</div>
{/snippet}

{#snippet headerDetails(d: MapData)}
	{@const data = d as NestData}
	{#if data.name}<p class="text-sm font-medium">{data.name}</p>{/if}
	<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
		<span title={m.nest_avg()}>{m.nest_avg_value({ avg: formatDecimal(data.pokemon_avg) })}</span>
		<span>{m.spawnpoints()}: {formatNumber(data.spawnpoints)}</span>
	</div>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as NestData}

	<TitledMainSection Icon={Info} title={m.about_this_nest()}>
		<StatsMainCard>
			<StatsMainCardEntry
				Icon={CircleSlash2}
				name={m.nest_ratio()}
				value={formatPercentage((data.pokemon_ratio ?? 0) / 100)}
			/>
			<StatsMainCardEntry
				Icon={VectorSquare}
				name={m.nest_size()}
				value={m.square_m_value({ size: formatNumber(data.m2, { maximumFractionDigits: 0 }) })}
			/>
			<UpdatedTimes updated={data.updated ?? undefined} />
			<QuickSearchButton
				class="mt-0!"
				label={m.find_wild_name({ name: mPokemon(data) })}
				onclick={() =>
					setActiveSearchPokemon({ pokemon_id: data.pokemon_id ?? 0, form: data.form ?? 0 })}
			/>
		</StatsMainCard>
	</TitledMainSection>

	<PokemonStatsCard data={{ pokemon_id: data.pokemon_id ?? 0, form: data.form ?? 0 }} />

	{#if getConfig().general.showAccessMaps !== false}
		<TitledMainSection Icon={CircleDot} title={m.access_this_nest()}>
			<AccessPolygonMap
				polygon={data.polygon}
				fillColor="rgba(152, 248, 163, 0.4)"
				strokeColor="rgba(152, 248, 163, 0.8)"
			/>
		</TitledMainSection>
	{/if}
{/snippet}
