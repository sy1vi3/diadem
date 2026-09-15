<script module lang="ts">
	import { getConfig } from "$lib/services/config/config";
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mMove, mPokemon } from "$lib/services/ingameLocale";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import type { StationData } from "$lib/types/mapObjectData/station";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import { formatNumber } from "$lib/utils/numberFormat";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import {
		calculateMaxBattleCp,
		getStationPokemon,
		isMaxBattleActive,
		STATION_SLOTS
	} from "$lib/utils/stationUtils";
	import { getIconPokemon, getIconStation } from "$lib/services/uicons.svelte";
	import { resize } from "$lib/services/assets";
	import { setActiveSearchMaxBattleBoss } from "$lib/features/activeSearch.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import { CircleDot, Clock, Swords, UsersRound } from "@lucide/svelte";

	export { image, headerDetails, main };

	export function getPopupPropsStation(data: MapData) {
		data = data as StationData;
		const active = hasActiveMaxBattle(data);

		return {
			type: active ? m.pogo_max_battle() : m.pogo_station(),
			title: active ? mPokemon(getStationPokemon(data)) : data.name,
			image,
			headerDetails,
			main
		} as MapObjectPopupProps;
	}

	function hasActiveMaxBattle(data: StationData) {
		return Boolean(data.battle_pokemon_id && isMaxBattleActive(data));
	}

	function hasLastMaxBattle(data: StationData) {
		return Boolean(data.battle_pokemon_id && (data.end_time ?? 0) < currentTimestamp());
	}
</script>

<script>
	import DynamaxIcon from "@/components/icons/DynamaxIcon.svelte";
	import { Calculator, HandFist, Heart } from "@lucide/svelte";
	import { getStationAttackBonus } from "$lib/utils/stationUtils";
	import { formatPercentage } from "$lib/utils/numberFormat";
	import { getIconBackground } from "$lib/services/uicons.svelte";
</script>

{#snippet image(d: MapData)}
	{@const data = d as StationData}
	<div class="size-14 shrink-0">
		{#if hasActiveMaxBattle(data)}
			<ImagePopup
				alt={mPokemon(getStationPokemon(data))}
				src={getIconPokemon(getStationPokemon(data))}
				class="size-14"
			/>
		{:else}
			<ImagePopup alt={m.pogo_station()} src={getIconStation(data)} class="size-14" />
		{/if}
	</div>
{/snippet}

{#snippet headerDetails(d: MapData)}
	{@const data = d as StationData}
	{@const cp = hasActiveMaxBattle(data) ? calculateMaxBattleCp(data) : undefined}
	{#if hasActiveMaxBattle(data)}
		<p class="text-sm font-medium">{data.name}</p>
		<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
			<span
				>{(data.start_time ?? 0) > currentTimestamp() ? m.raid_starts() : m.raid_ends()}
				<Countdown
					expireTime={(data.start_time ?? 0) > currentTimestamp() ? data.start_time : data.end_time}
					showHours={true}
				/></span
			>
			{#if data.battle_level != null}<span>{m.tier()} {data.battle_level}</span>{/if}
			{#if cp != null}<span>{m.cp()} {cp}</span>{/if}
			{#if data.total_stationed_pokemon != null}<span
					>{m.stationed()}: {data.total_stationed_pokemon}/{STATION_SLOTS}</span
				>{/if}
			{#if data.total_stationed_gmax != null}<span
					>{m.max_battle_gmax()}: {data.total_stationed_gmax}</span
				>{/if}
		</div>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as StationData}
	{@const active = hasActiveMaxBattle(data)}
	{@const pokemon = getStationPokemon(data)}
	{@const pokemonName = mPokemon(pokemon)}

	{#if active}
		<TitledMainSection Icon={DynamaxIcon} title={m.pogo_max_battle()}>
			<BasicMainCard>
				<div class="space-y-3">
					<StatsMainCardEntry
						Icon={Clock}
						name={m.battle_time()}
						value={m.range_to({
							x: timestampToLocalTime(data.start_time, { showDate: true, showSeconds: false }),
							y: timestampToLocalTime(data.end_time, { showDate: true, showSeconds: false })
						})}
					/>
					<StatsMainCardEntry Icon={Swords} name={m.popup_pokemon_moves()}>
						{#snippet value()}
							<p class="flex flex-wrap justify-end gap-x-2">
								{#if data.battle_pokemon_move_1 && data.battle_pokemon_move_2}
									<span>{mMove(data.battle_pokemon_move_1)}</span>
									<span>·</span>
									<span>{mMove(data.battle_pokemon_move_2)}</span>
								{:else}
									{m.unknown()}
								{/if}
							</p>
						{/snippet}
					</StatsMainCardEntry>
					<details>
						<summary class="cursor-pointer text-sm text-muted-foreground">{m.stats()}</summary>
						<div class="mt-2 space-y-2">
							<StatsMainCardEntry
								Icon={Heart}
								name={m.stamina()}
								value={formatNumber(data.battle_pokemon_stamina)}
							/>
							<StatsMainCardEntry
								Icon={Calculator}
								name={m.cpm()}
								value={formatNumber(data.battle_pokemon_cp_multiplier)}
							/>
						</div>
					</details>
				</div>

				<QuickSearchButton
					label={m.find_more_x({ x: m.pokemon_max_battles({ pokemon: pokemonName }) })}
					onclick={() =>
						setActiveSearchMaxBattleBoss(
							m.pokemon_max_battles({ pokemon: pokemonName }),
							data.battle_pokemon_id ?? 0,
							data.battle_pokemon_form ?? 0,
							data.battle_pokemon_bread_mode ?? 0
						)}
				/>
			</BasicMainCard>
		</TitledMainSection>

		{#if (data.total_stationed_pokemon ?? 0) > 0 || data.stationed_pokemon?.length}
			<TitledMainSection Icon={UsersRound} title={m.stationed_pokemon()}>
				<BasicMainCard>
					<div class="space-y-3">
						<StatsMainCardEntry
							Icon={HandFist}
							name={m.attack_bonus()}
							value={formatPercentage(getStationAttackBonus(data.total_stationed_pokemon ?? 0), {
								minDecimals: 0,
								maxDecimals: 1
							})}
						/>
					</div>
					{#if data.stationed_pokemon?.length}
						<div class="-mx-4 mt-3">
							<div class="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 px-4 mt-2">
								{#each data.stationed_pokemon as pokemon}
									<div class="flex items-center gap-2 rounded-md p-2 bg-accent-highlight">
										<div class="size-10 relative shrink-0">
											<ImagePopup
												class="absolute size-full z-10"
												src={resize(getIconPokemon(pokemon), { width: 64 })}
												alt={mPokemon(pokemon)}
											/>
											{#if pokemon.background}
												<ImagePopup
													class="absolute size-10 mask-[radial-gradient(circle,black_35%,transparent_70%)]"
													src={resize(getIconBackground(pokemon.background), { width: 64 })}
													alt={m.background()}
												/>
											{/if}
										</div>
										<span class="min-w-0 break-words text-sm">{mPokemon(pokemon)}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</BasicMainCard>
			</TitledMainSection>
		{/if}
	{:else if hasLastMaxBattle(data)}
		<p class="text-sm text-muted-foreground">
			{m.last_max_battle_notice({
				time: timestampToLocalTime(data.end_time, { showDate: true, showSeconds: false })
			})}
		</p>
	{/if}

	{#if getConfig().general.showAccessMaps !== false}
		<TitledMainSection Icon={CircleDot} title={m.access_this_power_spot()}>
			<MainAccessMap
				lat={data.lat}
				lon={data.lon}
				type={MapObjectType.STATION}
				uiconType="station"
				radius={80}
				zoom={15.5}
				icon={resize(getIconStation(data), { width: 64 })}
			/>
		</TitledMainSection>
	{/if}

	<UpdatedTimes updated={data.updated} />
{/snippet}
