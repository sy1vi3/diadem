import { beforeEach, expect, it, vi } from "vitest";
vi.hoisted(() => vi.stubGlobal("$state", (value: unknown) => value));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	getCurrentSelectedData: () => undefined
}));
import { MapObjectType } from "./mapObjectTypes";
import {
	addMapObjects,
	getMapObjects,
	getMapObjectsRevision,
	clearAllMapObjects,
	delMapObject,
	replaceMapObjects
} from "./mapObjectsState.svelte";
beforeEach(() => clearAllMapObjects());
it("keeps state identity and revision on empty deltas", () => {
	const object = {
		type: MapObjectType.POKEMON,
		mapId: "pokemon-1",
		id: "1",
		lat: 1,
		lon: 1,
		pokemon_id: 25
	} as any;
	addMapObjects([object], MapObjectType.POKEMON, 1);
	const state = getMapObjects(),
		revision = getMapObjectsRevision();
	addMapObjects([], MapObjectType.POKEMON, 0, true);
	expect(getMapObjects()).toBe(state);
	expect(getMapObjectsRevision()).toBe(revision);
});
it("marks payload changes and deletions, even when coordinates stay the same", () => {
	const object = {
		type: MapObjectType.POKEMON,
		mapId: "pokemon-1",
		id: "1",
		lat: 1,
		lon: 1,
		pokemon_id: 25
	} as any;
	addMapObjects([object], MapObjectType.POKEMON, 1);
	const revision = getMapObjectsRevision();
	addMapObjects([{ ...object, pokemon_id: 26 }], MapObjectType.POKEMON, 1, true);
	expect(getMapObjectsRevision()).toBeGreaterThan(revision);
	expect(getMapObjects()["pokemon-1"]).toMatchObject({ pokemon_id: 26 });
	const next = getMapObjectsRevision();
	delMapObject("pokemon-1");
	expect(getMapObjectsRevision()).toBeGreaterThan(next);
});

it("reuses identical full-response objects but catches nested changes with unchanged timestamps", () => {
	const obj = {
		type: MapObjectType.GYM,
		mapId: "gym-1",
		id: "1",
		lat: 1,
		lon: 1,
		updated: 100,
		defenders: [{ pokemon_id: 25, cp_now: 1000 }]
	} as any;
	replaceMapObjects([obj], MapObjectType.GYM, 1);
	const before = getMapObjects()["gym-1"];
	replaceMapObjects([JSON.parse(JSON.stringify(obj))], MapObjectType.GYM, 1);
	expect(getMapObjects()["gym-1"]).toBe(before);
	const changed = JSON.parse(JSON.stringify(obj));
	changed.defenders[0].cp_now = 900;
	replaceMapObjects([changed], MapObjectType.GYM, 1);
	expect(getMapObjects()["gym-1"]).not.toBe(before);
	expect(getMapObjects()["gym-1"]).toMatchObject({ defenders: [{ cp_now: 900 }] });
});
