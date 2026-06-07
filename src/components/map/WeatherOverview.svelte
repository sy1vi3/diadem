<script lang="ts">
	import { mType, mWeather } from "@/lib/services/ingameLocale.js";
	import {
		getCurrentWeather,
		getDisplayWeather,
		isWeatherDisplayActive,
		setWeatherDisplayActive,
		updateVisibleWeatherCells,
		updateWeather
	} from "@/lib/mapObjects/weather.svelte.js";
	import Button from "@/components/ui/input/Button.svelte";
	import { getMap } from "@/lib/map/map.svelte";
	import { ArrowBigUpDash, Clock } from "lucide-svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getWeatherIcon } from "@/lib/utils/weatherIcons.js";
	import { closePopup } from "@/lib/mapObjects/interact";
	import { slide, fade } from "svelte/transition";
	import { WEATHER_OUTDATED_SECONDS } from "@/lib/constants";
	import { getMasterWeather } from "@/lib/services/masterfile";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getIconType } from "@/lib/services/uicons.svelte.js";
	import { closeMenu } from "@/lib/ui/menus.svelte.js";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
	import { currentTimestamp } from "@/lib/utils/currentTimestamp";
	import { isSearchViewActive } from "@/lib/features/activeSearch.svelte";

	let displayWeather = $derived(getDisplayWeather());
	let boostedTypes: number[] = $derived(
		getMasterWeather(displayWeather?.gameplay_condition)?.types ?? []
	);

	async function onClick() {
		const next = !isWeatherDisplayActive();
		setWeatherDisplayActive(next);
		closeMenu();

		if (next) {
			if (getMap()?.isMoving()) await updateWeather();

			const weather = getCurrentWeather();
			if (weather && isWeatherUpdated(weather)) {
				closePopup();
				getMap()?.flyTo({
					center: {
						lng: weather.longitude,
						lat: weather.latitude
					},
					zoom: 11.5,
					bearing: 0,
					pitch: 0,
					speed: 3
				});
			}

			await updateVisibleWeatherCells();
		}
	}

	function isWeatherUpdated(weather: { updated: number } | undefined) {
		return (weather?.updated ?? 0) > currentTimestamp() - WEATHER_OUTDATED_SECONDS;
	}
</script>

{#if displayWeather && isWeatherUpdated(displayWeather) && hasLoadedFeature(LoadedFeature.REMOTE_LOCALE, LoadedFeature.ICON_SETS) && !isSearchViewActive()}
	<div class="pointer-events-none mx-2" transition:fade={{ duration: 90 }}>
		<Button
			variant="ghost"
			size=""
			class="pointer-events-auto px-4 py-3 text-sm bg-card flex-col! items-start! border rounded-lg shadow-lg hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground disabled:pointer-events-none"
			onclick={onClick}
		>
			<div>
				<IconValue Icon={getWeatherIcon(displayWeather?.gameplay_condition)}>
					{mWeather(displayWeather?.gameplay_condition)}
				</IconValue>
			</div>

			{#if isWeatherDisplayActive()}
				<div class="mt-2" transition:slide={{ duration: 70 }}>
					<IconValue Icon={ArrowBigUpDash}>
						{m.boosted()}:
					</IconValue>
					{#each boostedTypes as typeId}
						<div class="flex gap-2 mt-1 items-center">
							<div class="w-4 h-4 shrink-0">
								<ImagePopup alt={mType(typeId)} src={getIconType(typeId)} class="w-4 h-4" />
							</div>

							<span>
								{mType(typeId)}
							</span>
						</div>
					{/each}

					<div class="h-3"></div>

					<IconValue Icon={Clock}>
						{m.last_changed()}: <b>{timestampToLocalTime(displayWeather?.updated)}</b>
					</IconValue>
				</div>
			{/if}
		</Button>
	</div>
{/if}
