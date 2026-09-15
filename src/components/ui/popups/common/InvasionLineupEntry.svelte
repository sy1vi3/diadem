<script lang="ts">
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { mPokemon } from "$lib/services/ingameLocale";
	import { getInvasionPokemon } from "$lib/features/masterStats.svelte";
	import type { InvasionPokemonStats } from "$lib/server/api/queryStats";
	import type { PokemonVisual } from "$lib/types/mapObjectData/pokemon";
	import * as m from "$lib/paraglide/messages";

	let {
		position,
		lineup,
		slotPokemonId,
		slotForm
	}: {
		position: number;
		lineup: InvasionPokemonStats[];
		slotPokemonId: number | undefined;
		slotForm: number | undefined;
	} = $props();

	let catchable: boolean = $derived(lineup[0]?.encounter ?? false);
	let pokemon: PokemonVisual[] = $derived.by(() => {
		if (slotPokemonId) {
			return [getInvasionPokemon({ pokemon_id: slotPokemonId, form: slotForm })];
		}

		return lineup.map(getInvasionPokemon);
	});
</script>

<div class="flex items-start gap-3 rounded-md bg-accent-highlight px-3 py-2">
	<span class="pt-1 text-sm font-semibold text-muted-foreground">{position}</span>
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap gap-2">
			{#each pokemon as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}
				<span class="inline-flex items-center gap-1 text-sm">
					<ImagePopup class="size-8 shrink-0" src={getIconPokemon(slotMon)} alt="" />{mPokemon(
						slotMon
					)}
				</span>
			{/each}
		</div>
		{#if catchable}<p class="mt-1 text-xs text-indigo-600 dark:text-indigo-300">
				{m.catchable()}
			</p>{/if}
	</div>
</div>
