<script lang="ts">
	import { FillLayer, GeoJSON, LineLayer, Marker } from "svelte-maplibre";
	import type { FeatureCollection } from "geojson";
	import { MapSourceId } from "@/lib/map/layers";
	import { getMap } from "@/lib/map/map.svelte";
	import {
		getVisibleWeatherCells,
		isWeatherDisplayActive,
		setHoveredWeatherCell,
		WEATHER_FILL_LAYER
	} from "@/lib/mapObjects/weather.svelte";
	import { getWeatherIcon } from "@/lib/utils/weatherIcons";
	import { hasTouch } from "@/lib/utils/device";
	import type { MapLayerMouseEvent } from "maplibre-gl";

	const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

	let cells = $derived(getVisibleWeatherCells());

	$effect(() => {
		const map = getMap();
		if (!map) return;

		const onMove = (e: MapLayerMouseEvent) => {
			if (hasTouch()) return;
			const id = e.features?.[0]?.properties?.weatherId;
			setHoveredWeatherCell(id === undefined || id === null ? undefined : String(id));
		};

		map.on("mousemove", WEATHER_FILL_LAYER, onMove);
		return () => {
			map.off("mousemove", WEATHER_FILL_LAYER, onMove);
		};
	});
</script>

<GeoJSON id={MapSourceId.SELECTED_WEATHER} data={EMPTY}>
	{#if isWeatherDisplayActive()}
		<FillLayer
			id={WEATHER_FILL_LAYER}
			paint={{ "fill-color": ["get", "fillColor"], "fill-opacity": 0 }}
		/>
		<LineLayer
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{ "line-color": ["get", "strokeColor"], "line-width": 2 }}
		/>
	{/if}
</GeoJSON>

{#if isWeatherDisplayActive()}
	{#each cells as cell (cell.id)}
		{@const Icon = getWeatherIcon(cell.data.gameplay_condition)}
		<Marker lngLat={cell.center} interactive={false} class="pointer-events-none">
			<div
				class="flex items-center justify-center rounded-full border border-border bg-card/85 p-1 shadow"
			>
				<Icon class="size-5" />
			</div>
		</Marker>
	{/each}
{/if}
