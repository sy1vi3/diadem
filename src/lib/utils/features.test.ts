import { expect, it } from "vitest";
import { applyWorldwideMapData, Features, type Perms } from "./features";
import { hasFeatureAnywhere, isPointInAllowedArea } from "../services/user/checkPerm";

function grants(features: Perms["everywhere"], global = true): Perms {
	return {
		everywhere: global ? [Features.MAP_DATA_EVERYWHERE] : [],
		areas: [
			{
				name: "Local",
				features,
				polygon: {
					type: "Polygon",
					coordinates: [
						[
							[0, 0],
							[1, 0],
							[1, 1],
							[0, 1],
							[0, 0]
						]
					]
				}
			}
		]
	};
}
it("makes existing map data visible outside its area without enabling other features", () => {
	const original = grants([Features.GYM, Features.POKEMON_PVP, Features.WEATHER, Features.SCOUT]);
	const perms = applyWorldwideMapData(original);
	expect(isPointInAllowedArea(perms, Features.GYM, 40, 40)).toBe(true);
	expect(isPointInAllowedArea(perms, Features.POKEMON_IV, 40, 40)).toBe(true);
	expect(isPointInAllowedArea(perms, Features.WEATHER, 40, 40)).toBe(true);
	expect(hasFeatureAnywhere(perms, Features.RAID)).toBe(false);
	expect(hasFeatureAnywhere(perms, Features.POKEMON)).toBe(false);
	expect(isPointInAllowedArea(perms, Features.SCOUT, 40, 40)).toBe(false);
	expect(original.everywhere).toEqual([Features.MAP_DATA_EVERYWHERE]);
});
it("does not remove area restrictions without the global permission", () => {
	const perms = applyWorldwideMapData(grants([Features.GYM], false));
	expect(isPointInAllowedArea(perms, Features.GYM, 40, 40)).toBe(false);
});
it("expands family wildcards but never promotes tools from an area-scoped all grant", () => {
	const family = applyWorldwideMapData(grants([Features.POKEMON_ALL]));
	expect(isPointInAllowedArea(family, Features.POKEMON_PVP, 40, 40)).toBe(true);
	const all = applyWorldwideMapData(grants([Features.ALL]));
	expect(isPointInAllowedArea(all, Features.RAID, 40, 40)).toBe(true);
	expect(all.everywhere).not.toContain(Features.ALL);
	for (const feature of [
		Features.SCOUT,
		Features.WAYFARER_MAP,
		Features.COVERAGE_MAP,
		Features.SEARCH
	]) {
		expect(isPointInAllowedArea(all, feature, 40, 40)).toBe(false);
	}
});
it("grants nothing on its own or when the modifier is itself area-scoped", () => {
	const alone = applyWorldwideMapData({ everywhere: [Features.MAP_DATA_EVERYWHERE], areas: [] });
	expect(hasFeatureAnywhere(alone, Features.POKEMON)).toBe(false);
	const local = applyWorldwideMapData(grants([Features.MAP_DATA_EVERYWHERE, Features.GYM], false));
	expect(isPointInAllowedArea(local, Features.GYM, 40, 40)).toBe(false);
});
