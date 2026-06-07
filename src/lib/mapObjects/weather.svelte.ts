import { MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";
import { getMap } from "@/lib/map/map.svelte";
import { getBounds } from "@/lib/mapObjects/mapBounds";
import { cellToFeature, getCoveringS2Cells } from "@/lib/mapObjects/s2cells.js";
import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import type { WeatherData } from "@/lib/types/mapObjectData/weather";
import { Features } from "@/lib/utils/features";
import TTLCache from "@isaacs/ttlcache";
import type { Feature, Polygon } from "geojson";
import { s2 } from "s2js";
import type { CellID } from "s2js/dist/s2/cellid";

const WEATHER_CELL_LEVEL = 10;
const UPDATE_INTERVAL = 5 * 60 * 1000;
const MIN_ZOOM = 10;
const MAX_VISIBLE_CELLS = 300;
const CELL_COLOR = "#b8e6fe";
const CELL_STROKE = "#6cb6e0";

export const WEATHER_FILL_LAYER = "weatherCellsFill";

export type WeatherCellRow = {
	id: string;
	latitude: number;
	longitude: number;
	gameplay_condition: number | null;
	updated: number;
};

export type VisibleWeatherCell = {
	id: string;
	cellId: CellID;
	center: [number, number];
	data: WeatherCellRow;
};

// Single nearest cell, drives the WeatherOverview button.
const weatherCache: TTLCache<string, WeatherData> = new TTLCache({
	max: 1000,
	ttl: UPDATE_INTERVAL
});
let currentWeather: WeatherData | undefined = $state(undefined);

const cellWeatherCache: TTLCache<string, WeatherCellRow> = new TTLCache({
	max: 4000,
	ttl: UPDATE_INTERVAL
});
let weatherDisplayActive = $state(false);
let visibleWeatherCells: VisibleWeatherCell[] = $state([]);
let hoveredWeatherCellId: string | undefined = $state(undefined);

export function getCurrentWeather() {
	return currentWeather;
}

export function isWeatherDisplayActive() {
	return weatherDisplayActive;
}

export function getVisibleWeatherCells() {
	return visibleWeatherCells;
}

function getHoveredWeatherCell(): VisibleWeatherCell | undefined {
	if (!hoveredWeatherCellId) return undefined;
	return visibleWeatherCells.find((cell) => cell.id === hoveredWeatherCellId);
}

function getSelectedObjectWeatherCell(): WeatherCellRow | undefined {
	const selected = getCurrentSelectedData();
	if (!selected || selected.lat == null || selected.lon == null) return undefined;

	const eps = 1e-6;
	const cells = getCoveringS2Cells(
		{
			minLat: selected.lat - eps,
			maxLat: selected.lat + eps,
			minLon: selected.lon - eps,
			maxLon: selected.lon + eps
		},
		WEATHER_CELL_LEVEL
	);
	if (!cells.length) return undefined;

	const id = BigInt.asIntN(64, cells[0]).toString();
	return visibleWeatherCells.find((cell) => cell.id === id)?.data;
}

export type DisplayWeather = { gameplay_condition: number | null; updated: number };

export function getDisplayWeather(): DisplayWeather | undefined {
	if (weatherDisplayActive) {
		const selected = getSelectedObjectWeatherCell();
		if (selected) return selected;

		const hovered = getHoveredWeatherCell();
		if (hovered) return hovered.data;
	}
	return currentWeather;
}

export function setHoveredWeatherCell(id: string | undefined) {
	if (hoveredWeatherCellId === id) return;
	hoveredWeatherCellId = id;
}

export function setWeatherDisplayActive(active: boolean) {
	weatherDisplayActive = active;
	if (!active) {
		visibleWeatherCells = [];
		hoveredWeatherCellId = undefined;
		const map = getMap();
		if (map) {
			updateMapGeojsonSource(map, MapSourceId.SELECTED_WEATHER, {
				type: "FeatureCollection",
				features: []
			});
		}
	}
}

function renderWeatherCellFeatures() {
	const map = getMap();
	if (!map) return;

	const features: Feature<Polygon>[] = visibleWeatherCells.map((cell) => {
		const feature = cellToFeature(
			cell.cellId,
			CELL_STROKE,
			CELL_COLOR,
			"weathercell"
		) as Feature<Polygon>;
		(feature.properties as Record<string, unknown>).weatherId = cell.id;
		return feature;
	});

	updateMapGeojsonSource(map, MapSourceId.SELECTED_WEATHER, {
		type: "FeatureCollection",
		features
	});
}

export async function updateVisibleWeatherCells() {
	const map = getMap();
	if (!map || !weatherDisplayActive) return;
	if (!hasFeatureAnywhere(getUserDetails().permissions, Features.WEATHER)) return;

	if (map.getZoom() < MIN_ZOOM) {
		if (visibleWeatherCells.length) {
			visibleWeatherCells = [];
			renderWeatherCellFeatures();
		}
		return;
	}

	const covering = getCoveringS2Cells(getBounds(false), WEATHER_CELL_LEVEL);
	if (covering.length <= 0 || covering.length > MAX_VISIBLE_CELLS) {
		if (visibleWeatherCells.length) {
			visibleWeatherCells = [];
			renderWeatherCellFeatures();
		}
		return;
	}

	const list = covering.map((cellId) => ({ cellId, id: BigInt.asIntN(64, cellId).toString() }));
	const missing = list.filter((c) => !cellWeatherCache.has(c.id)).map((c) => c.id);

	if (missing.length) {
		const response = await fetch("/api/weather", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cellIds: missing })
		});
		if (response.ok) {
			const rows = (await response.json()) as WeatherCellRow[];
			for (const row of rows) cellWeatherCache.set(String(row.id), row);
		}
	}

	if (!weatherDisplayActive) return;

	const built: VisibleWeatherCell[] = [];
	for (const c of list) {
		const data = cellWeatherCache.get(c.id);
		if (!data) continue;
		built.push({ id: c.id, cellId: c.cellId, center: [data.longitude, data.latitude], data });
	}

	visibleWeatherCells = built;
	renderWeatherCellFeatures();
}

export async function updateWeather() {
	if (!hasFeatureAnywhere(getUserDetails().permissions, Features.WEATHER)) {
		currentWeather = undefined;
		return;
	}

	// TODO: update more often after full hour
	const map = getMap();
	if (!map) return;

	if (map.getZoom() < MIN_ZOOM) {
		if (currentWeather) currentWeather = undefined;
		return;
	}

	const bounds = getBounds(false);
	const cells = getCoveringS2Cells(bounds, WEATHER_CELL_LEVEL);

	if (cells.length <= 0) return;

	let weatherCell: CellID = cells[0];

	if (cells.length > 1) {
		const center = map.getCenter();
		let smallestDistance: number | undefined = undefined;

		cells.forEach((cellId) => {
			const cell = s2.Cell.fromCellID(cellId);
			const distance = cell.distance(
				s2.Point.fromLatLng(s2.LatLng.fromDegrees(center.lat, center.lng))
			);
			if (smallestDistance === undefined || distance < smallestDistance) {
				smallestDistance = distance;
				weatherCell = cellId;
			}
		});
	}

	const weatherCacheKey = weatherCell.toString();
	if (weatherCache.has(weatherCacheKey)) {
		if (currentWeather?.cellId !== weatherCell) {
			currentWeather = weatherCache.get(weatherCacheKey);
		}
		return;
	}

	const response = await fetch("/api/weather/" + BigInt.asIntN(64, weatherCell).toString());

	if (!response.ok) return;

	const data = await response.json();

	if (!data?.length) return;

	const weatherData = data[0] as WeatherData;

	if (weatherData) weatherData.cellId = weatherCell;

	weatherCache.set(weatherCacheKey, weatherData);
	currentWeather = weatherData;
}
