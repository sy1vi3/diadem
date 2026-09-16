<script module lang="ts">
	import { isMenuSidebar } from "$lib/utils/device";
	import MobileActivityPreview, {
		type PopupActivity
	} from "../common/MobileActivityPreview.svelte";
	import { getConfig } from "$lib/services/config/config";
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mCharacter, mItem, mPokemon, mQuest } from "$lib/services/ingameLocale";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import {
		getIconBackground,
		getIconInvasion,
		getIconItem,
		getIconPokemon,
		getIconPokestop,
		getIconReward
	} from "$lib/services/uicons.svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import {
		BadgeCheck,
		CircleAlert,
		CircleDot,
		Clock,
		Flower,
		Medal,
		ShieldHalf,
		SlidersHorizontal,
		UsersRound
	} from "@lucide/svelte";
	import type { Incident, PokestopData } from "$lib/types/mapObjectData/pokestop";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import {
		CONTEST_SLOTS,
		getContestIcon,
		getContestText,
		getRewardText,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon,
		KECLEON_ID
	} from "$lib/utils/pokestopUtils";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import QuestIcon from "@/components/icons/QuestIcon.svelte";
	import InvasionIcon from "@/components/icons/InvasionIcon.svelte";
	import { getInvasionLineup, getInvasionPokemon } from "$lib/features/masterStats.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";
	import { resize } from "$lib/services/assets";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { matchInvasionFilterset, matchQuestFilterset } from "$lib/features/filterLogic/pokestop";
	import FiltersetIcon from "$lib/features/filters/FiltersetIcon.svelte";
	import { filterTitle } from "$lib/features/filters/filtersetUtils.svelte";
	import type { AnyFilterset } from "$lib/features/filters/filtersets";
	import MainCardBigIcon from "@/components/ui/popups/common/MainCardBigIcon.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import { isFortOutdated } from "$lib/utils/gymUtils";
	import BigExpireTime from "@/components/ui/popups/common/BigExpireTime.svelte";
	import InvasionLineupEntry from "@/components/ui/popups/common/InvasionLineupEntry.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import {
		setActiveSearchInvasion,
		setActiveSearchKecleon,
		setActiveSearchQuest
	} from "$lib/features/activeSearch.svelte";
	import { getActiveSearchQuestParams } from "$lib/services/search.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import AboutFort from "@/components/ui/popups/common/AboutFort.svelte";
	import { givesQuestBackground } from "$lib/utils/pokestopUtils";
	import RoutesStartingHere from "@/components/ui/popups/route/RoutesStartingHere.svelte";

	export { image, headerDetails, main };

	export function getPopupPropsPokestop(data: MapData) {
		data = data as PokestopData;
		return {
			type: m.pogo_pokestop(),
			title: data.name ?? m.unknown_pokestop(),
			image,
			headerDetails: isMenuSidebar() ? undefined : headerDetails,
			main
		} as MapObjectPopupProps;
	}

	function getIncidents(data: PokestopData) {
		const invasions: Incident[] = [];
		const kecleons: Incident[] = [];
		const contests: Incident[] = [];

		for (const incident of data.incident) {
			if (incident.id && incident.expiration > currentTimestamp()) {
				if (isIncidentInvasion(incident)) {
					invasions.push(incident);
				} else if (isIncidentContest(incident)) {
					contests.push(incident);
				} else if (isIncidentKecleon(incident)) {
					kecleons.push(incident);
				}
			}
		}
		return [invasions, kecleons, contests];
	}

	function getMatchingFiltersets(
		quest: PokestopData["quests"][number] | undefined,
		invasions: Incident[]
	) {
		const filtersets: AnyFilterset[] = [];
		const questFilterset = quest ? matchQuestFilterset(quest) : undefined;
		if (questFilterset) filtersets.push(questFilterset);

		for (const invasion of invasions) {
			const invasionFilterset = matchInvasionFilterset(invasion);
			if (invasionFilterset && !filtersets.includes(invasionFilterset))
				filtersets.push(invasionFilterset);
		}

		return filtersets;
	}

	function showMatchingFiltersets() {
		const filter = getUserSettings().filters.pokestop;
		return (
			filter.enabled &&
			(filter.quest.filters.find((f) => f.enabled) ||
				filter.invasion.filters.find((f) => f.enabled))
		);
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as PokestopData}
	<FortImage
		alt={data.name ?? m.pogo_pokestop()}
		fortUrl={data.url}
		fortIcon={getIconPokestop(data)}
		fortName={data.name}
		fortDescription={data.description}
	/>
{/snippet}

{#snippet headerDetails(d: MapData)}
	{@const data = d as PokestopData}
	{#if !isMenuSidebar() && !data.isRouteEndpoint && !isFortOutdated(data.updated)}
		{@const [invasions, kecleons] = getIncidents(data)}
		<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
			{#if data.lure_expire_timestamp && data.lure_expire_timestamp >= currentTimestamp()}
				<span class="inline-flex flex-wrap items-center gap-1.5">
					<ImagePopup class="size-5" src={getIconItem(data.lure_id ?? 501)} alt="" />
					{mItem(data.lure_id ?? 501)}
					<span class="text-muted-foreground"
						><Countdown expireTime={data.lure_expire_timestamp} /></span
					>
				</span>
			{/if}
		</div>
		{#if !isMenuSidebar()}
			{@const quest = data.quests[0]}
			{@const activities: PopupActivity[] = [
                ...(quest && (!quest.expires || quest.expires > currentTimestamp()) ? [{
                    kind: "quest" as const,
                    icon: getIconReward(quest.reward.type, quest.reward.info),
                    title: getRewardText(quest.reward),
                    subtitle: givesQuestBackground(quest) ? m.with_background() : m.pogo_quest(),
                    description: mQuest(quest.title, quest.target)
                }] : []),
                ...invasions.map((invasion) => ({
                    kind: "invasion" as const,
                    icon: getIconInvasion(invasion.character, invasion.confirmed),
                    title: mCharacter(invasion.character, { confirmed: invasion.confirmed }),
                    expires: invasion.expiration,
                    timerLabel: m.raid_ends()
                })),
                ...kecleons.map((kecleon) => ({
                    kind: "kecleon" as const,
                    icon: getIconPokemon({ pokemon_id: KECLEON_ID }),
                    title: m.kecleon(),
                    expires: kecleon.expiration,
                    timerLabel: m.raid_ends()
                }))
            ]}
			{#if activities.length}
				<div
					class:mt-2={!!data.lure_expire_timestamp &&
						data.lure_expire_timestamp >= currentTimestamp()}
				>
					<MobileActivityPreview {activities} />
				</div>
			{/if}
		{/if}
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as PokestopData}
	{@const quest = data.quests[0]}
	{@const [invasions, kecleons, contests] = getIncidents(data)}

	{#if !data.isRouteEndpoint}
		{#if isFortOutdated(data?.updated)}
			<BasicMainCard class="font-medium">
				<IconValue Icon={CircleAlert}>
					{m.pokestop_outdated_notice({
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
			{#if data.lure_expire_timestamp && data.lure_expire_timestamp >= currentTimestamp()}
				<BasicMainCard>
					<div class="flex items-center gap-3">
						<ImagePopup class="size-10 shrink-0" src={getIconItem(data.lure_id ?? 501)} alt="" />
						<span class="min-w-0 flex-1 text-sm font-semibold">{mItem(data.lure_id ?? 501)}</span>
						<span class="shrink-0 text-xs tabular-nums"
							><span class="text-muted-foreground">{m.raid_ends()}</span>
							<Countdown expireTime={data.lure_expire_timestamp} /></span
						>
					</div>
				</BasicMainCard>
			{/if}
			{#if quest}
				<TitledMainSection Icon={QuestIcon} title={m.pogo_quest()}>
					<BasicMainCard>
						<div class="mb-3 flex items-center gap-2" class:gap-3!={givesQuestBackground(quest)}>
							<div class="relative size-7 shrink-0" class:size-9!={givesQuestBackground(quest)}>
								<ImagePopup
									class="absolute size-full z-10"
									src={getIconReward(quest.reward.type, quest.reward.info)}
									alt={getRewardText(quest.reward)}
								/>
								{#if givesQuestBackground(quest) && "background" in quest.reward.info && quest.reward.info.background}
									<ImagePopup
										class="absolute size-full scale-125 mask-[radial-gradient(circle,black_35%,transparent_70%)]"
										src={resize(getIconBackground(quest.reward.info.background), { width: 64 })}
										alt={m.background()}
									/>
								{/if}
							</div>
							<div>
								<h3 class="font-semibold">
									{getRewardText(quest.reward)}
								</h3>
								{#if givesQuestBackground(quest)}
									<p class="flex gap-1.5 text-muted-foreground">
										<Flower class="size-3.5 mt-1 shrink-0" />
										{m.with_background()}
									</p>
								{/if}
							</div>
						</div>

						<div class="mb-3">
							<p class="text-muted-foreground text-sm">
								{m.task()}
							</p>
							<p class="font-medium">
								{mQuest(quest.title, quest.target)}
							</p>
						</div>

						<StatsMainCardEntry
							Icon={Clock}
							name={m.popup_found()}
							value={timestampToLocalTime(quest.timestamp, {
								showDate: true,
								showSeconds: false,
								dayLowerCase: false
							})}
						/>

						<QuickSearchButton
							label={m.find_more_x_quests({ x: getRewardText(quest.reward) })}
							onclick={() => {
								const { name, reward } = getActiveSearchQuestParams(quest.reward);
								setActiveSearchQuest(name, reward);
							}}
						/>
					</BasicMainCard>
				</TitledMainSection>
			{/if}

			{#if invasions.length > 0}
				<TitledMainSection Icon={InvasionIcon} title={m.pogo_invasion()}>
					<div class="space-y-4">
						{#each invasions as invasion (invasion.id)}
							{@const lineup = getInvasionLineup(invasion.character)}
							<BasicMainCard>
								{@const reward = invasion.confirmed_reward}
								{@const name = mCharacter(invasion.character, { confirmed: invasion.confirmed })}

								<MainCardBigIcon
									src={getIconInvasion(invasion.character, invasion.confirmed)}
									alt={name}
									title={name}
								/>

								<BigExpireTime expire={invasion.expiration} />

								{#if reward}
									<IconValue class="mt-5" Icon={BadgeCheck}>
										{m.confirmed_reward()}
									</IconValue>
									<div class="bg-accent-highlight rounded-md p-3 mt-2">
										<div class="flex gap-4 w-full justify-center items-center">
											<div class="size-10 shrink-0">
												<ImagePopup
													class="size-10"
													src={getIconPokemon(reward)}
													alt={mPokemon(reward)}
												/>
											</div>

											<span class="font-semibold">
												{mPokemon(reward)}
											</span>
										</div>
										{#if lineup?.second?.[0]?.encounter}
											<div class="flex flex-col items-center mt-5 mb-1">
												<p class="">
													{m.or_x_chance_to_get({ chance: 16 })}
												</p>

												<div class="flex flex-wrap gap-3 mt-2">
													{#each lineup.second as extraReward (extraReward.pokemon_id + "-" + extraReward.form)}
														{@const pokemon = getInvasionPokemon(extraReward)}
														{#if !(pokemon.pokemon_id === reward.pokemon_id && pokemon.form === reward.form)}
															<div>
																<div class="size-8 shrink-0">
																	<ImagePopup
																		class="size-8"
																		src={getIconPokemon(pokemon)}
																		alt={mPokemon(pokemon)}
																	/>
																</div>
															</div>
														{/if}
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/if}

								{#if lineup}
									<div class="-mx-4 mt-5">
										<IconValue class="mb-1.5 px-4" Icon={ShieldHalf}>
											{m.possible_lineup()}
										</IconValue>
										<div class="grid grid-cols-1 gap-2 px-4 mt-2">
											<InvasionLineupEntry
												position={1}
												lineup={lineup.first}
												slotPokemonId={invasion.slot_1_pokemon_id}
												slotForm={invasion.slot_1_form}
											/>
											<InvasionLineupEntry
												position={2}
												lineup={lineup.second}
												slotPokemonId={invasion.slot_2_pokemon_id}
												slotForm={invasion.slot_2_form}
											/>
											<InvasionLineupEntry
												position={3}
												lineup={lineup.third}
												slotPokemonId={invasion.slot_3_pokemon_id}
												slotForm={invasion.slot_3_form}
											/>
										</div>
									</div>
								{/if}

								<QuickSearchButton
									label={m.find_more_x({ x: mCharacter(invasion.character, { plural: true }) })}
									onclick={() => {
										setActiveSearchInvasion(name, invasion.character);
									}}
								/>
							</BasicMainCard>
						{/each}
					</div>
				</TitledMainSection>
			{/if}

			{#if kecleons.length > 0}
				<BasicMainCard>
					<div class="space-y-2">
						{#each kecleons as kecleon (kecleon.id)}
							<div class="flex items-center gap-3">
								<ImagePopup
									class="size-10 shrink-0"
									src={getIconPokemon({ pokemon_id: KECLEON_ID })}
									alt=""
								/>
								<span class="min-w-0 flex-1 text-sm font-semibold">{m.kecleon()}</span>
								<span class="shrink-0 text-xs tabular-nums"
									><span class="text-muted-foreground">{m.raid_ends()}</span>
									<Countdown expireTime={kecleon.expiration} /></span
								>
							</div>
						{/each}
					</div>
					<QuickSearchButton
						label={m.find_more_x({ x: m.kecleon() })}
						onclick={setActiveSearchKecleon}
					/>
				</BasicMainCard>
			{/if}

			{#if contests.length > 0 && (data.showcase_expiry ?? 0) >= currentTimestamp()}
				<TitledMainSection Icon={Medal} title={m.contest()}>
					<BasicMainCard>
						{@const name =
							data.showcase_ranking_standard && data.contest_focus
								? getContestText(data.showcase_ranking_standard, data.contest_focus)
								: m.unknown_contest()}

						<MainCardBigIcon src={getContestIcon(data.contest_focus)} alt={name} title={name} />

						<div class="space-y-3">
							<StatsMainCardEntry Icon={UsersRound} name={m.entries()}>
								{#snippet value()}
									<span>
										{#if data.contest_rankings}
											<b>{data.contest_rankings.total_entries}</b>/{CONTEST_SLOTS}
										{:else}
											{m.unavailable()}
										{/if}
									</span>
								{/snippet}
							</StatsMainCardEntry>

							<div class="w-full flex gap-2 flex-col">
								{#each data?.contest_rankings?.contest_entries ?? [] as entry (entry.rank)}
									<div
										class="w-full rounded-md bg-accent-highlight px-4 relative flex justify-between items-center"
									>
										<div class="py-3">
											<p class=" font-semibold">
												{mPokemon(entry)}
											</p>

											<p>
												{m.score_x({ score: entry.score.toFixed(0) })}
											</p>
										</div>
										<div class="flex items-end text-right">
											<div class="size-12 shrink-0 -mr-5 z-10 mb-3 relative">
												<ImagePopup
													src={getIconPokemon(entry)}
													alt={mPokemon(entry)}
													class="absolute size-full z-10"
												/>
												{#if entry.background}
													<ImagePopup
														class="absolute size-12 mask-[radial-gradient(circle,black_35%,transparent_70%)]"
														src={resize(getIconBackground(entry.background), { width: 64 })}
														alt={m.background()}
													/>
												{/if}
											</div>
											<span class="font-black text-7xl text-muted-foreground/50">
												{entry.rank}
											</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</BasicMainCard>
				</TitledMainSection>
			{/if}
		{/if}
	{/if}

	<RoutesStartingHere fortId={data.id} />

	{#if getConfig().general.showAccessMaps !== false}
		<TitledMainSection Icon={CircleDot} title={m.access_this_pokestop()}>
			<MainAccessMap
				lat={data.lat}
				lon={data.lon}
				type={MapObjectType.POKESTOP}
				uiconType="pokestop"
				radius={80}
				zoom={15.5}
				icon={resize(getIconPokestop({}), { width: 64 })}
			/>
		</TitledMainSection>
	{/if}

	{#if !data.isRouteEndpoint && showMatchingFiltersets()}
		{@const filtersets = getMatchingFiltersets(quest, invasions)}
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

	<AboutFort
		title={m.about_this_pokestop()}
		name={data.name}
		description={data.description}
		imageUrl={data.url}
		sponsorId={data.sponsor_id}
		partnerId={data.partner_id}
		defaultName={m.pogo_pokestop()}
		updated={data.updated}
		lastModified={data.last_modified_timestamp}
		firstSeen={data.first_seen_timestamp}
		isRouteEndpoint={data.isRouteEndpoint}
	/>
{/snippet}
