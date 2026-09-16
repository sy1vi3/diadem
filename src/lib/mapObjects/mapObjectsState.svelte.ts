import { sameMapObject } from "./mapObjectEquality";
import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
import {
	allMapObjectTypes,
	type QueryableMapData,
	MapObjectType
} from "@/lib/mapObjects/mapObjectTypes";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { routeStartsAt } from "@/lib/utils/routeUtils";

export type MapObjectsStateType = {
	[key: string]: QueryableMapData;
};

let mapObjectsState: MapObjectsStateType = $state({});
let revision = 0;
// Keep the decoded payload alongside its reactive view. Comparing two plain API
// payloads avoids walking Svelte proxies on every full viewport response.
const payloads = new Map<string, QueryableMapData>();

function reuseUnchangedMapObject(object: QueryableMapData) {
	const existing = mapObjectsState[object.mapId];
	if (existing && sameMapObject(payloads.get(object.mapId), object)) return existing;
	payloads.set(object.mapId, object);
	return object;
}

export function getMapObjectsRevision() {
	return revision;
}

let mapObjectCounts = $state(getInitialMapObjectCount());
const popupPreservedRouteMapIds = new Set<string>();

export function getMapObjects() {
	return mapObjectsState;
}

export function addMapObjects(
	mapObjects: QueryableMapData[],
	type: MapObjectType,
	examined: number,
	isDelta: boolean = false
) {
	if (isDelta && mapObjects.length === 0) return;
	revision++;
	mapObjectsState = {
		...mapObjectsState,
		...Object.fromEntries(mapObjects.map((o) => [o.mapId, reuseUnchangedMapObject(o)]))
	};
	if (isDelta) {
		const prefix = type + "-";
		let showing = 0;
		for (const key in mapObjectsState) {
			if (key.startsWith(prefix)) showing++;
		}
		// we're not updating examined on deltas.
		// the examined counts are therefore inaccurate.
		// but that's fine. deltas happen when the map doesn't move, so the count should be
		// close enough.
		mapObjectCounts[type].showing = showing;
	} else {
		mapObjectCounts[type] = { showing: mapObjects.length, examined };
	}
}

export function replaceMapObjects(
	mapObjects: QueryableMapData[],
	type: MapObjectType,
	examined: number
) {
	const selected = getCurrentSelectedData();
	const selectedMapId = selected?.mapId;
	const prefix = type + "-";
	const nextMapObjects = { ...mapObjectsState };
	const incomingMapIds = new Set(mapObjects.map((mapObject) => mapObject.mapId));

	for (const mapId in nextMapObjects) {
		const preserveForFortPopup =
			type === MapObjectType.ROUTE &&
			!incomingMapIds.has(mapId) &&
			(selected?.type === MapObjectType.POKESTOP || selected?.type === MapObjectType.GYM) &&
			nextMapObjects[mapId]?.type === MapObjectType.ROUTE &&
			routeStartsAt(nextMapObjects[mapId] as RouteData, selected.id);
		if (preserveForFortPopup) popupPreservedRouteMapIds.add(mapId);
		if (
			mapId !== selectedMapId &&
			!preserveForFortPopup &&
			mapId.startsWith(prefix) &&
			!incomingMapIds.has(mapId)
		) {
			popupPreservedRouteMapIds.delete(mapId);
			payloads.delete(mapId);
			delete nextMapObjects[mapId];
		}
	}
	for (const mapObject of mapObjects) {
		popupPreservedRouteMapIds.delete(mapObject.mapId);
		nextMapObjects[mapObject.mapId] = reuseUnchangedMapObject(mapObject);
	}

	revision++;
	mapObjectsState = nextMapObjects;
	mapObjectCounts[type] = { showing: mapObjects.length, examined };
}

export function delMapObject(key: string) {
	payloads.delete(key);
	if (key in mapObjectsState) revision++;
	popupPreservedRouteMapIds.delete(key);
	delete mapObjectsState[key];
}

export function clearPopupPreservedRoutes() {
	for (const mapId of popupPreservedRouteMapIds) delMapObject(mapId);
	popupPreservedRouteMapIds.clear();
}

export function clearMapObjects(type: MapObjectType) {
	mapObjectCounts[type] = { showing: 0, examined: 0 };

	for (const key in getMapObjects()) {
		// skip selected data
		if (getCurrentSelectedData()?.mapId === key) continue;

		if (key.startsWith(type + "-")) {
			delMapObject(key);
		}
	}
}

export function clearAllMapObjects() {
	payloads.clear();
	revision++;
	mapObjectsState = {};
	mapObjectCounts = getInitialMapObjectCount();
	popupPreservedRouteMapIds.clear();
}

export function getMapObjectCounts(type: MapObjectType) {
	return mapObjectCounts[type];
}

function getInitialMapObjectCount(): {
	[key in MapObjectType]: { showing: number; examined: number };
} {
	return Object.fromEntries(
		allMapObjectTypes.map((type) => [type, { showing: 0, examined: 0 }])
	) as Record<MapObjectType, { showing: number; examined: number }>;
}
