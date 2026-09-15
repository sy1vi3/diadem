<script module lang="ts">
	import { getConfig } from "$lib/services/config/config";
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mMove, mPokemon, mRaid, mTeam } from "$lib/services/ingameLocale";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import type { GymData } from "$lib/types/mapObjectData/gym";
	import {
		getIconGym,
		getIconPokemon,
		getIconRaidEgg,
		getIconTeam
	} from "$lib/services/uicons.svelte";
	import { resize } from "$lib/services/assets";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import {
		getRaidPokemon,
		GYM_SLOTS,
		hasActiveRaid,
		isFortOutdated,
		isRaidHatched
	} from "$lib/utils/gymUtils";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import RaidIcon from "@/components/icons/RaidIcon.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import AboutFort from "@/components/ui/popups/common/AboutFort.svelte";
	import BasicPokemonDisplayMultiple from "@/components/ui/popups/common/BasicPokemonDisplayMultiple.svelte";
	import BasicPokemonDisplayOne from "@/components/ui/popups/common/BasicPokemonDisplayOne.svelte";
	import {
		BadgeCheck,
		CircleAlert,
		CircleDot,
		Clock,
		ShieldHalf,
		SlidersHorizontal,
		Swords,
		UserRoundCheck
	} from "@lucide/svelte";
	import { getActiveRaidsForLevel } from "$lib/features/masterStats.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";

	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { matchRaidFilterset } from "$lib/features/filterLogic/gym";
	import FiltersetIcon from "$lib/features/filters/FiltersetIcon.svelte";
	import { filterTitle } from "$lib/features/filters/filtersetUtils.svelte";
	import type { AnyFilterset } from "$lib/features/filters/filtersets";

	import RoutesStartingHere from "@/components/ui/popups/route/RoutesStartingHere.svelte";

	import GymDefenderRow from "./GymDefenderRow.svelte";
	export { image, headerDetails, main };

	export function getPopupPropsGym(data: MapData) {
		data = data as GymData;
		return {
			type: m.pogo_gym(),
			title: data.name ?? m.unknown_gym(),
			image,
			headerDetails,
			main
		} as MapObjectPopupProps;
	}

	function getOccupiedSlots(data: GymData) {
		return GYM_SLOTS - (data.availble_slots ?? 0);
	}

	function getRaidTitle(data: GymData) {
		if (data.raid_pokemon_id) return mPokemon(getRaidPokemon(data));
		return mRaid(data.raid_level);
	}

	function getRaidIcon(data: GymData) {
		if (data.raid_pokemon_id) return getIconPokemon(getRaidPokemon(data));
		return getIconRaidEgg(data.raid_level ?? 0, isRaidHatched(data));
	}

	function getRaidExpire(data: GymData) {
		return isRaidHatched(data) ? data.raid_end_timestamp : data.raid_battle_timestamp;
	}

	function hasRaidData(data: GymData) {
		return Boolean(data.raid_level && data.raid_end_timestamp);
	}

	function getMatchingFiltersets(data: GymData) {
		const filtersets: AnyFilterset[] = [];
		const raidFilterset = isActiveRaid(data) ? matchRaidFilterset(data) : undefined;
		if (raidFilterset) filtersets.push(raidFilterset);

		return filtersets;
	}

	function isActiveRaid(data: GymData) {
		return hasActiveRaid(data) && hasRaidData(data);
	}

	function showMatchingFiltersets() {
		const filter = getUserSettings().filters.gym;
		return (
			filter.enabled && filter.raid.enabled && Boolean(filter.raid.filters.find((f) => f.enabled))
		);
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as GymData}
	<FortImage
		alt={data.name ?? m.pogo_gym()}
		fortUrl={data.url}
		fortIcon={getIconGym(data)}
		fortName={data.name}
		fortDescription={data.description}
	/>
{/snippet}

{#snippet headerDetails(d: MapData)}
	{@const data = d as GymData}
	{#if !data.isRouteEndpoint && !isFortOutdated(data.updated)}
		{#if isActiveRaid(data)}
			<div class="mt-2 flex items-center gap-2 text-sm">
				<ImagePopup class="size-9 shrink-0" src={getRaidIcon(data)} alt="" />
				<div class="min-w-0">
					<p class="font-semibold">
						{getRaidTitle(data)}{#if data.raid_pokemon_id}<span
								class="ml-2 text-xs font-normal text-muted-foreground"
								>{mRaid(data.raid_level)}</span
							>{/if}
					</p>
					<p class="text-xs text-muted-foreground">
						{isRaidHatched(data) ? m.raid_ends() : m.raid_starts()}
						<Countdown expireTime={getRaidExpire(data)} />
					</p>
				</div>
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as GymData}
	{@const activeRaid = isActiveRaid(data)}

	{#if !data.isRouteEndpoint}
		{#if isFortOutdated(data.updated)}
			<BasicMainCard class="font-medium">
				<IconValue Icon={CircleAlert}>
					{m.gym_outdated_notice({
						time: timestampToLocalTime(data.updated, {
							showDate: true,
							showSeconds: false,
							showTime: false,
							longMonth: true
						})
					})}
				</IconValue>
			</BasicMainCard>
		{:else}
			{#if activeRaid}<TitledMainSection Icon={RaidIcon} title={m.raid()}>
					<BasicMainCard>
						<div class="space-y-3">
							<!--Expiration-->
							<div>
								<IconValue class="mb-1" Icon={Clock}>
									{m.battle_time()}
								</IconValue>

								<div class="text-sm tabular-nums">
									{m.range_to({
										x: timestampToLocalTime(data.raid_battle_timestamp),
										y: timestampToLocalTime(data.raid_end_timestamp)
									})}
								</div>
							</div>

							<!--Hatch Prediction-->
							{#if !data.raid_pokemon_id && data.raid_level}
								{@const possibleBosses = getActiveRaidsForLevel(data.raid_level)}
								{#if possibleBosses?.length}
									<div>
										<IconValue class="" Icon={BadgeCheck}>
											{#if possibleBosses.length === 1}
												{m.possible_hatch()}
											{:else}
												{m.possible_hatches()}
											{/if}
										</IconValue>

										{#if possibleBosses.length === 1}
											{@const boss = possibleBosses[0]}
											<BasicPokemonDisplayOne pokemon={boss} />
										{:else}
											<BasicPokemonDisplayMultiple pokemon={possibleBosses} />
										{/if}
									</div>
								{/if}
							{/if}

							<!--RSVPs-->
							{#if data?.rsvps?.length}
								<div>
									<IconValue Icon={UserRoundCheck}>
										{m.rsvp()}
									</IconValue>
									<div class="mt-1 space-y-3 rounded-md bg-accent-highlight py-3 px-5">
										{#each data.rsvps as rsvp (rsvp.timeslot)}
											<div
												class="grid items-center gap-x-2"
												style="grid-template-columns: auto 1fr"
											>
												<b>{timestampToLocalTime(rsvp.timeslot / 1000, { showSeconds: false })}</b>
												<span class="text-right"
													>{m.rsvp_entry({
														going: rsvp.going_count,
														maybe: rsvp.maybe_count
													})}</span
												>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!--Raid Attributes-->
							{#if data.raid_pokemon_id}
								<div class="space-y-3">
									{#if data.raid_pokemon_cp != null}
										<StatsMainCardEntry
											Icon={ShieldHalf}
											name={m.cp()}
											value={data.raid_pokemon_cp}
										/>
									{/if}
									<StatsMainCardEntry Icon={Swords} name={m.popup_pokemon_moves()}>
										{#snippet value()}
											<p class="flex flex-wrap justify-end gap-x-2">
												{#if data.raid_pokemon_move_1 && data.raid_pokemon_move_2}
													<span>{mMove(data.raid_pokemon_move_1)}</span>
													<span>·</span>
													<span>{mMove(data.raid_pokemon_move_2)}</span>
												{:else}
													{m.unknown()}
												{/if}
											</p>
										{/snippet}
									</StatsMainCardEntry>
								</div>
							{/if}
						</div>
					</BasicMainCard>
				</TitledMainSection>{/if}

			{#if data.team_id != null || data.availble_slots != null || data.defenders?.length}
				<section aria-label={m.gym_members()}>
					<h2
						class="mb-2 flex flex-wrap items-center gap-2 border-l-2 border-current pl-2 font-semibold"
						class:text-blue-600={data.team_id === 1}
						class:dark:text-blue-400={data.team_id === 1}
						class:text-red-600={data.team_id === 2}
						class:dark:text-red-400={data.team_id === 2}
						class:text-amber-700={data.team_id === 3}
						class:dark:text-yellow-400={data.team_id === 3}
						class:text-muted-foreground={!data.team_id}
					>
						{#if data.team_id != null}<ImagePopup
								class="size-5"
								src={getIconTeam(data.team_id)}
								alt=""
							/>{mTeam(data.team_id)}{:else}{m.gym_members()}{/if}
						{#if data.availble_slots != null}<span
								class="text-sm font-normal tabular-nums"
								title={m.slots_occupied()}>{getOccupiedSlots(data)}/{GYM_SLOTS}</span
							>{/if}
					</h2>
					{#if data.defenders?.length}
						{#key data.mapId}
							<div
								class="divide-y divide-border overflow-hidden rounded-lg border border-border"
								class:border-blue-500={data.team_id === 1}
								class:border-red-500={data.team_id === 2}
								class:border-yellow-500={data.team_id === 3}
							>
								{#each data.defenders as defender}<GymDefenderRow {defender} />{/each}
							</div>
						{/key}
					{/if}
				</section>
			{/if}
		{/if}
	{/if}

	<RoutesStartingHere fortId={data.id} />

	{#if getConfig().general.showAccessMaps !== false}
		<TitledMainSection Icon={CircleDot} title={m.access_this_gym()}>
			<MainAccessMap
				lat={data.lat}
				lon={data.lon}
				type={MapObjectType.GYM}
				uiconType="gym"
				radius={80}
				zoom={15.5}
				icon={resize(getIconGym(data), { width: 64 })}
			/>
		</TitledMainSection>
	{/if}

	{#if showMatchingFiltersets()}
		<TitledMainSection Icon={SlidersHorizontal} title={m.matching_filtersets()}>
			<BasicMainCard>
				{@const filtersets = getMatchingFiltersets(data)}

				{#if filtersets.length === 0}
					<p>{m.filters_dont_match_gym()}</p>
				{/if}
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

	<AboutFort
		title={m.about_this_gym()}
		name={data.name}
		description={data.description}
		imageUrl={data.url}
		sponsorId={data.sponsor_id}
		partnerId={data.partner_id}
		defaultName={m.pogo_gym()}
		updated={data.updated}
		lastModified={data.last_modified_timestamp}
		firstSeen={data.first_seen_timestamp}
		isRouteEndpoint={data.isRouteEndpoint}
	/>
{/snippet}
