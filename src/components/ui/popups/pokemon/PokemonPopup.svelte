<script module lang="ts">
	import type { Snippet } from "svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import { getConfig } from "$lib/services/config/config";
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mItem, mMove, mPokemon, mWeather, mType } from "$lib/services/ingameLocale";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";
	import { getIconItem, getIconPokemon, getIconType } from "$lib/services/uicons.svelte";
	import {
		getPokemonStats as getMasterPokemonStats,
		type PokemonStats
	} from "$lib/features/masterStats.svelte";
	import type { PokemonData, PvpStats } from "$lib/types/mapObjectData/pokemon";
	import { isPointInAllowedArea } from "$lib/services/user/checkPerm";
	import { getUserDetails } from "$lib/services/user/userDetails.svelte";
	import { Features } from "$lib/utils/features";
	import { formatNumber, formatPercentage } from "$lib/utils/numberFormat";
	import {
		getActivePokemonFilter,
		getBestRank,
		getPokemonSize,
		hasTimer,
		League,
		showGreat,
		showLittle,
		showPvp,
		showUltra
	} from "$lib/utils/pokemonUtils";
	import { resize } from "$lib/services/assets";
	import { getWeatherIcon } from "$lib/utils/weatherIcons";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { matchPokemonFiltersets } from "$lib/features/filterLogic/pokemon";
	import { filterTitle } from "$lib/features/filters/filtersetUtils.svelte";
	import {
		ArrowLeftRight,
		BicepsFlexed,
		ChevronDown,
		CircleDot,
		Clock,
		CircleSmall,
		Expand,
		Info,
		Mars,
		Ruler,
		Shrink,
		SlidersHorizontal,
		Spotlight,
		Swords,
		Venus
	} from "@lucide/svelte";
	import FiltersetIcon from "$lib/features/filters/FiltersetIcon.svelte";
	import PokemonStatsCard from "@/components/ui/popups/common/PokemonStatsCard.svelte";
	import { mLeague } from "$lib/services/ingameLocale";
	import { getIconLeague } from "$lib/services/uicons.svelte";

	import { getMasterPokemon } from "$lib/services/masterfile";
	export { image, titleDetails, heading, main };

	type PvpLeague = League.LITTLE | League.GREAT | League.ULTRA;
	type PvpPopupEntry = PvpStats & { league: PvpLeague };

	const DEFAULT_PVP_LEAGUE_ORDER: PvpLeague[] = [League.GREAT, League.ULTRA, League.LITTLE];
	const PVP_FILTER_ATTRIBUTES: Record<
		PvpLeague,
		"pvpRankLittle" | "pvpRankGreat" | "pvpRankUltra"
	> = {
		[League.LITTLE]: "pvpRankLittle",
		[League.GREAT]: "pvpRankGreat",
		[League.ULTRA]: "pvpRankUltra"
	};

	export function getPopupPropsPokemon(data: MapData) {
		data = data as PokemonData;
		return {
			type: m.wild_pokemon(),
			title: pokemonName(data),
			image,
			heading,
			main
		} as MapObjectPopupProps;
	}

	let mapExpandedRadius: boolean = $state(false);

	function pokemonName(data: Partial<PokemonData>) {
		return mPokemon(data);
	}

	function speciesName(data: PokemonData) {
		return mPokemon({ pokemon_id: data.pokemon_id });
	}

	function canSeeIv(data: PokemonData) {
		return (
			data &&
			isPointInAllowedArea(getUserDetails().permissions, Features.POKEMON_IV, data.lat, data.lon)
		);
	}

	function getPvpPopupEntries(data: PokemonData): PvpPopupEntry[] {
		const activeFilter = getActivePokemonFilter();
		const enabledFilters = activeFilter?.filters.filter((filter) => filter.enabled) ?? [];
		const promotedLeagues: PvpLeague[] = [];
		if (enabledFilters.some((filter) => filter.pvpRankUltra)) promotedLeagues.push(League.ULTRA);
		if (enabledFilters.some((filter) => filter.pvpRankLittle)) promotedLeagues.push(League.LITTLE);
		const leagueOrder = [
			...promotedLeagues,
			...DEFAULT_PVP_LEAGUE_ORDER.filter((league) => !promotedLeagues.includes(league))
		];

		return leagueOrder
			.flatMap((league) =>
				(data.pvp?.[league] ?? [])
					.filter((entry) =>
						showPvp(entry.rank, PVP_FILTER_ATTRIBUTES[league], false, activeFilter)
					)
					.map((entry) => ({ ...entry, league }))
			)
			.sort((a, b) => {
				const leagueSort = leagueOrder.indexOf(a.league) - leagueOrder.indexOf(b.league);
				if (leagueSort !== 0) return leagueSort;
				const rankSort = a.rank - b.rank;
				if (rankSort !== 0) return rankSort;
				return a.cap - b.cap;
			});
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as PokemonData}
	<div class="size-14 shrink-0">
		<ImagePopup alt={mPokemon(data)} src={getIconPokemon(data)} class="size-14" />
	</div>
{/snippet}

{#snippet titleDetails(d: MapData)}
	{@const data = d as PokemonData}
	<div class="flex flex-wrap items-center gap-1.5">
		{#each getMasterPokemon(data.pokemon_id, data.form)?.types ?? [] as type}
			<ImagePopup src={getIconType(type)} alt={mType(type)} class="size-4" />
		{/each}
		{#if data.weather}
			{@const WeatherIcon = getWeatherIcon(data.weather)}
			<span
				class="inline-flex size-5 shrink-0 items-center justify-center rounded bg-accent text-foreground"
				role="img"
				aria-label={m.pokemon_weather_boosted({ weather: mWeather(data.weather) })}
				title={m.pokemon_weather_boosted({ weather: mWeather(data.weather) })}
			>
				<WeatherIcon class="size-3.5" aria-hidden="true" />
			</span>
		{/if}
		{#if data.size === 1 || data.size === 5}
			<span
				class="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold leading-none"
				class:bg-amber-100={data.size === 5}
				class:text-amber-800={data.size === 5}
				class:dark:bg-amber-950={data.size === 5}
				class:dark:text-amber-200={data.size === 5}
				class:bg-violet-100={data.size === 1}
				class:text-violet-800={data.size === 1}
				class:dark:bg-violet-950={data.size === 1}
				class:dark:text-violet-200={data.size === 1}
			>
				{#if data.size === 5}<Expand class="size-3" />{:else}<Shrink class="size-3" />{/if}
				{getPokemonSize(data.size)}
			</span>
		{/if}
	</div>
{/snippet}

{#snippet heading(d: MapData, controls: Snippet)}
	{@const data = d as PokemonData}
	{@const visibleLeagues = [League.LITTLE, League.GREAT, League.ULTRA].filter(
		(league) =>
			getBestRank(data, league) > 0 &&
			((league === League.LITTLE && showLittle(data)) ||
				(league === League.GREAT && showGreat(data)) ||
				(league === League.ULTRA && showUltra(data)))
	)}
	<div class="flex items-center gap-3 px-4">
		{@render image(data)}
		<div class="min-w-0 flex-1">
			<div class="flex items-center justify-between gap-2">
				<div
					class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
				>
					<span>{m.wild_pokemon()}</span>
					<span
						class="inline-flex shrink-0 items-center gap-1.5 tabular-nums"
						title={hasTimer(data) ? m.popup_despawns() : m.popup_found()}
						><Clock class="size-3.5" />
						{#if !hasTimer(data)}{m.popup_found()}{/if}
						<span class="font-medium text-foreground"
							><Countdown
								expireTime={hasTimer(data) ? data.expire_timestamp : data.first_seen_timestamp}
							/></span
						>
					</span>
				</div>
				<div class="flex shrink-0 gap-1 [&_button]:size-7 [&_button]:p-1.5 [&_svg]:size-3.5">
					{@render controls()}
				</div>
			</div>
			<div class="mt-1 flex items-baseline justify-between gap-2">
				<h1
					class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold [overflow-wrap:anywhere]"
				>
					<span class="min-w-0 max-w-full">{pokemonName(data)}</span>
					{@render titleDetails(data)}
				</h1>
				{#if data.cp != null}
					<div class="flex shrink-0 items-baseline gap-1 tabular-nums">
						<span class="text-xs text-muted-foreground">{m.cp()}</span>
						<strong class="text-2xl font-semibold">{formatNumber(data.cp)}</strong>
					</div>
				{/if}
			</div>
			{#if data.iv != null || data.level != null || visibleLeagues.length}
				<div class="mt-1 flex items-center justify-between gap-2 tabular-nums max-[360px]:-ml-17">
					<div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
						{#if data.iv != null}
							<strong class="inline-block w-14 shrink-0 text-lg font-semibold" title={m.pogo_ivs()}
								>{@render coloredIvs(data.iv, 1)}</strong
							>
						{/if}
						{#if data.iv != null}
							<span
								class="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
								title="{m.attack_iv()}/{m.defense_iv()}/{m.stamina_iv()}"
								>{data.atk_iv ?? "–"}/{data.def_iv ?? "–"}/{data.sta_iv ?? "–"}</span
							>
						{/if}
						{#if visibleLeagues.length}
							<div
								class="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-[11px]"
								aria-label={m.pvp_performance()}
							>
								{#each visibleLeagues as league}
									<span
										class="inline-flex items-center gap-0.5"
										title="{mLeague(league)} · {m.rank_x({ rank: getBestRank(data, league) })}"
									>
										<ImagePopup
											src={getIconLeague(league)}
											alt={mLeague(league)}
											class="size-3.5"
										/>#{getBestRank(data, league)}
									</span>
								{/each}
							</div>
						{/if}
					</div>
					{#if data.level != null}
						<div class="ml-auto flex shrink-0 items-baseline gap-1 text-sm">
							<span class="text-xs text-muted-foreground">{m.pokemon_level_label_short()}</span>
							<span class="font-medium text-foreground">{formatNumber(data.level)}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as PokemonData}
	{@const stats: PokemonStats | undefined = getMasterPokemonStats(data.pokemon_id, data.form ?? 0)}
	{@const statsEntry = stats?.entry}

	{#if !hasTimer(data)}
		<p class="text-xs text-muted-foreground">
			{data.seen_type?.includes("nearby")
				? m.unknown_spawnpoint_notice_nearby()
				: m.unknown_spawnpoint_notice()}
		</p>
	{/if}

	<div class="space-y-2 hidden has-[>_*]:block">
		<!--Special seen types-->
		{#if data.seen_type?.includes("lure")}
			<BasicMainCard class="flex gap-4 font-medium items-center justify-center">
				<img class="w-8 shrink-0" src={resize(getIconItem(501), { width: 64 })} alt={mItem(501)} />
				{m.notice_lure({ name: speciesName(data) })}
			</BasicMainCard>
		{:else if data.seen_type?.includes("tappable")}
			<BasicMainCard class="flex gap-4 font-medium items-center justify-center">
				<img
					class="w-8 shrink-0"
					src={resize(getIconItem(1151), { width: 64 })}
					alt={mItem(1151)}
				/>
				{m.notice_tappable({ name: speciesName(data) })}
			</BasicMainCard>
		{:else if data.seen_type?.includes("nearby")}
			<BasicMainCard class="text-center">
				{m.notice_nearby({ name: speciesName(data) })}
			</BasicMainCard>
		{/if}

		<!--No IVs-->
		{#if !data.seen_type?.includes("nearby") && !data.iv && data.iv !== 0 && canSeeIv(data)}
			<BasicMainCard class="text-center">
				{m.notice_wild({ name: speciesName(data) })}
			</BasicMainCard>
		{/if}

		<!--Mighty-->
		{#if data.strong}
			<BasicMainCard class="flex gap-2 justify-center">
				<BicepsFlexed class="size-4 mt-0.5" />
				{m.notice_mighty()}
			</BasicMainCard>
		{/if}

		<!--Rarity notice-->
		{#if stats && statsEntry && statsEntry.spawns && statsEntry.spawns.count / stats.total.count <= 0.000001}
			<BasicMainCard class="flex gap-2 font-medium justify-center">
				<Spotlight class="size-4 mt-1" />
				{m.notice_extremely_rare({
					name: speciesName(data),
					chance: formatNumber(stats.total.count / statsEntry.spawns.count, {
						maximumFractionDigits: 0
					})
				})}
			</BasicMainCard>
		{/if}

		<!--Ditto-->
		{#if data.display_pokemon_id}
			{@const displayPokemon = {
				pokemon_id: data.display_pokemon_id,
				form: data.display_pokemon_form
			}}
			<BasicMainCard class="flex gap-4 font-medium items-center justify-center">
				<ImagePopup
					class="size-10 shrink-0"
					src={getIconPokemon(displayPokemon)}
					alt={mPokemon(displayPokemon)}
				/>
				{m.notice_disguise({
					name1: pokemonName(data),
					name2: pokemonName(displayPokemon)
				})}
			</BasicMainCard>
		{/if}

		{#if Math.abs((data.changed ?? 0) - (data.updated ?? data.changed ?? 0)) > 10}
			<BasicMainCard class="flex gap-2 items-center justify-center">
				<ArrowLeftRight class="size-4" />
				{m.popup_species_changed()}
			</BasicMainCard>
		{/if}
	</div>

	{@const pvpEntries = getPvpPopupEntries(data)}
	{#if pvpEntries.length}
		<TitledMainSection Icon={Swords} title={m.pvp_performance()}>
			{#key data.mapId}
				<div class="space-y-3">
					{#each [...new Set(pvpEntries.map((entry) => entry.league))] as league}
						<section aria-label={mLeague(league)}>
							<h3 class="mb-1.5 flex items-center gap-2 text-sm font-medium">
								<ImagePopup class="size-5" src={getIconLeague(league)} alt="" />
								{mLeague(league)}
							</h3>
							<div class="divide-y divide-border overflow-hidden rounded-lg border border-border">
								{#each pvpEntries.filter((entry) => entry.league === league) as pokemon}
									<details class="group">
										<summary
											class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
										>
											<ImagePopup class="size-10 shrink-0" src={getIconPokemon(pokemon)} alt="" />
											<span class="min-w-0 flex-1">
												<span class="block text-sm font-medium break-words"
													>{mPokemon(pokemon)}</span
												>
												<span class="block text-xs text-muted-foreground"
													>{m.considered_max_level()}: {formatNumber(pokemon.cap)}</span
												>
											</span>
											<span class="shrink-0 text-right tabular-nums">
												<span
													class="block font-semibold"
													class:text-amber-600={pokemon.rank === 1}
													class:dark:text-amber-400={pokemon.rank === 1}
													>{m.rank_x({ rank: pokemon.rank })}</span
												>
												<span class="block text-xs text-muted-foreground" title={m.performance()}
													>{formatPercentage(pokemon.percentage, {
														minDecimals: 0,
														maxDecimals: 1
													})}</span
												>
											</span>
											<ChevronDown
												class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
											/>
										</summary>
										<div
											class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border bg-accent/30 px-3 py-2 text-sm"
										>
											<span class="text-muted-foreground">{m.pvp_target()}</span>
											<span class="tabular-nums"
												><span class="font-medium">{m.pogo_cp({ cp: pokemon.cp })}</span> · {m.pogo_level(
													{ level: formatNumber(pokemon.level) }
												)}</span
											>
										</div>
									</details>
								{/each}
							</div>
						</section>
					{/each}
				</div>
			{/key}
		</TitledMainSection>
	{/if}

	<PokemonStatsCard {data} />

	{#if !data.seen_type?.includes("nearby")}
		{#if getConfig().general.showAccessMaps !== false}
			<TitledMainSection
				Icon={CircleDot}
				title={m.access_this_pokemon({ name: speciesName(data) })}
			>
				<div class="relative">
					<MainAccessMap
						lat={data.lat}
						lon={data.lon}
						type={MapObjectType.POKEMON}
						uiconType="pokemon"
						radius={mapExpandedRadius ? 80 : 40}
						zoom={mapExpandedRadius ? 15.5 : 16.5}
						icon={resize(getIconPokemon(data), { width: 64 })}
					/>
					<Button
						variant="outline"
						size="sm"
						class="mt-2 absolute top-3 right-3 bg-accent! hover:bg-background! active:bg-background!"
						onclick={() => (mapExpandedRadius = !mapExpandedRadius)}
					>
						{#if mapExpandedRadius}
							<Shrink class="size-3.5" />
							{m.normal()}
						{:else}
							<Expand class="size-3.5" />
							{m.popup_action_spacial_rend()}
						{/if}
					</Button>
				</div>
			</TitledMainSection>
		{/if}
	{/if}

	{#if getUserSettings().filters.pokemon.enabled && getUserSettings().filters.pokemon.filters.find((f) => f.enabled)}
		{@const filtersets = matchPokemonFiltersets(data)}
		{#if filtersets.length > 0}
			<TitledMainSection Icon={SlidersHorizontal} title={m.matching_filtersets()}>
				<BasicMainCard>
					<div class="flex flex-wrap gap-3">
						{#each filtersets as filterset (filterset.id)}
							<div
								class="flex gap-3 font-medium items-center bg-accent-highlight px-4 py-2 rounded-md"
							>
								<FiltersetIcon {filterset} size={4} />
								{filterTitle(filterset)}
							</div>
						{/each}
					</div>
				</BasicMainCard>
			</TitledMainSection>
		{/if}
	{/if}

	<TitledMainSection Icon={Info} title={m.about_this_pokemon({ name: speciesName(data) })}>
		<StatsMainCard>
			{#if data.cp != null}<StatsMainCardEntry name={m.cp()} value={formatNumber(data.cp)} />{/if}
			{#if data.level != null}<StatsMainCardEntry
					name={m.level()}
					value={formatNumber(data.level)}
				/>{/if}
			{#if data.iv != null}{@const iv = data.iv}<StatsMainCardEntry name={m.pogo_ivs()}
					>{#snippet value()}{@render coloredIvs(iv, 1)}{/snippet}</StatsMainCardEntry
				>{/if}
			{#if data.atk_iv != null || data.def_iv != null || data.sta_iv != null}
				<dl
					class="grid w-full grid-cols-3 gap-3 border-y border-border py-3 text-center text-sm tabular-nums"
				>
					{#each [{ label: m.attack(), value: data.atk_iv }, { label: m.defense(), value: data.def_iv }, { label: m.stamina(), value: data.sta_iv }] as stat}
						<div>
							<dt class="text-xs text-muted-foreground">{stat.label}</dt>
							<dd class="mt-1">
								{stat.value ?? "–"} <span class="text-xs text-muted-foreground">/ 15</span>
							</dd>
						</div>
					{/each}
				</dl>
			{/if}
			{#if data.expire_timestamp}<StatsMainCardEntry name={m.popup_despawns()}
					>{#snippet value()}<span
							>{timestampToLocalTime(data.expire_timestamp)}
							<span class="text-xs text-muted-foreground"
								>· {data.expire_timestamp_verified
									? m.pokemon_timer_verified()
									: m.pokemon_timer_estimated()}</span
							></span
						>{/snippet}</StatsMainCardEntry
				>{/if}
			{#if data.weather != null}<StatsMainCardEntry
					name={m.weather_boost()}
					value={data.weather ? mWeather(data.weather) : m.no_weather_boost()}
				/>{/if}

			<StatsMainCardEntry
				Icon={data.gender === 1 ? Mars : data.gender === 2 ? Venus : CircleSmall}
				name={m.pokemon_gender()}
			>
				{#snippet value()}
					{#if data.gender != null}
						{#if data.gender === 1}
							{m.pokemon_gender_male()}
						{:else if data.gender === 2}
							{m.pokemon_gender_female()}
						{:else}
							{m.pokemon_gender_neutral()}
						{/if}
					{:else}
						<span class="text-muted-foreground">
							{m.unknown()}
						</span>
					{/if}
				{/snippet}
			</StatsMainCardEntry>
			<StatsMainCardEntry
				Icon={Ruler}
				name={m.pokemon_size()}
				value={data.size != null ? getPokemonSize(data.size) : m.unknown()}
			/>
			<StatsMainCardEntry Icon={Swords} name={m.popup_pokemon_moves()}>
				{#snippet value()}
					<p class="flex gap-2">
						{#if data.move_1 && data.move_2}
							<span>{mMove(data.move_1)}</span>
							<span>·</span>
							<span>{mMove(data.move_2)}</span>
						{:else}
							{m.unknown()}
						{/if}
					</p>
				{/snippet}
			</StatsMainCardEntry>

			<UpdatedTimes
				firstSeen={data.first_seen_timestamp}
				updated={Math.abs((data?.first_seen_timestamp ?? 0) - (data?.updated ?? 0)) > 5
					? data.updated
					: undefined}
			/>
		</StatsMainCard>
	</TitledMainSection>
{/snippet}

{#snippet coloredIvs(iv: number, decimals: number)}
	<span
		class:text-tier-0={iv <= 50}
		class:text-tier-1={iv > 50 && iv <= 75}
		class:text-tier-2={iv > 75 && iv < 90}
		class:text-tier-3={iv >= 90 && iv <= 99}
		class:text-tier-4={iv > 99}
	>
		{formatPercentage(iv / 100, { minDecimals: 0, maxDecimals: decimals })}
	</span>
{/snippet}
