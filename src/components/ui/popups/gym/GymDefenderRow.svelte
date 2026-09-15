<script lang="ts">
	import type { GymDefender } from "$lib/types/mapObjectData/gym";
	import * as m from "$lib/paraglide/messages";
	import { mPokemon } from "$lib/services/ingameLocale";
	import { getIconPokemon, getIconBackground } from "$lib/services/uicons.svelte";
	import { resize } from "$lib/services/assets";
	import { formatPercentage } from "$lib/utils/numberFormat";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import Countdown from "@/components/utils/Countdown.svelte";
	import ImagePopup from "../common/ImagePopup.svelte";
	import StatsMainCardEntry from "../common/StatsMainCardEntry.svelte";
	import { Candy, ChevronDown, Clock, Heart, Shield, SquareEqual, Swords } from "@lucide/svelte";
	let { defender }: { defender: GymDefender } = $props();
</script>

<details class="group">
	<summary
		class="flex cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
	>
		<span class="relative size-10 shrink-0">
			{#if defender.background}<ImagePopup
					class="absolute size-full"
					src={resize(getIconBackground(defender.background), { width: 64 })}
					alt={m.background()}
				/>{/if}
			<ImagePopup class="relative size-full" src={getIconPokemon(defender)} alt="" />
		</span>
		<span class="min-w-0 flex-1">
			<span class="block font-medium break-words">{mPokemon(defender)}</span>
			<span class="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground tabular-nums">
				<span>{m.cp()} {defender.cp_now}</span>
				<span class="inline-flex items-center gap-1"
					><Heart class="size-3 text-rose-400" />{formatPercentage(defender.motivation_now, {
						maxDecimals: 0,
						minDecimals: 0
					})}</span
				>
			</span>
		</span>
		<ChevronDown
			class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
		/>
	</summary>
	<div class="space-y-2 border-t border-border px-4 py-3 text-sm">
		<StatsMainCardEntry
			Icon={SquareEqual}
			name={m.defender_deployed_cp()}
			value={defender.cp_when_deployed}
		/>
		<StatsMainCardEntry Icon={Swords} name={m.won()} value={defender.battles_won} />
		<StatsMainCardEntry Icon={Shield} name={m.lost()} value={defender.battles_lost} />
		<StatsMainCardEntry Icon={Candy} name={m.fed()} value={defender.times_fed} />
		<StatsMainCardEntry Icon={Clock} name={m.defender_placed()}>
			{#snippet value()}
				<span
					title={timestampToLocalTime(defender.deployed_time, {
						showDate: true,
						showSeconds: false,
						dayLowerCase: false
					})}><Countdown expireTime={defender.deployed_time} showHours={true} /></span
				>
			{/snippet}
		</StatsMainCardEntry>
	</div>
</details>
