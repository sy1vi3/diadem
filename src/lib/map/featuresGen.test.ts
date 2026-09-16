import { beforeEach, expect, it, vi } from "vitest";
const clock = vi.hoisted(() => ({ now: 100, updates: vi.fn() }));
vi.mock("@/lib/map/render/manageGeojson", () => ({ updateMapObjectsGeoJson: clock.updates }));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte.js", () => ({
	getCurrentSelectedData: () => null,
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/map/render/renderMapObjects", () => ({
	getRenderer: () => ({
		render: (obj: any) =>
			obj.expire_timestamp < clock.now
				? []
				: [
						{
							type: "Feature",
							id: obj.mapId,
							geometry: { type: "Point", coordinates: [obj.lon, obj.lat] },
							properties: {
								type: 0,
								id: obj.mapId,
								expires: obj.expire_timestamp,
								imageId: String(obj.pokemon_id),
								imageUrl: "/icon"
							}
						}
					]
	})
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({ getUserSettings: () => ({ actions: {} }) }));
vi.mock("@/lib/utils/currentTimestamp", () => ({ currentTimestamp: () => clock.now }));
vi.mock("$lib/features/focusedRoute.svelte.js", () => ({
	getFocusedRouteMapId: () => null,
	setFocusedRouteMapId: vi.fn()
}));
vi.mock("@/lib/utils/routeUtils", () => ({ routeStartsAt: () => false }));
import { deleteAllFeatures, updateFeatures, hasExpiredFeatures } from "./featuresGen.svelte";
beforeEach(() => {
	clock.now = 100;
	deleteAllFeatures();
	clock.updates.mockClear();
});
const pokemon = (id: string, expire: number) =>
	({
		mapId: id,
		id,
		type: "pokemon",
		pokemon_id: 25,
		lat: 1,
		lon: 1,
		expire_timestamp: expire
	}) as any;
it("advances the expiry deadline and removes expired features even without new data", () => {
	const objects = {
		"pokemon-1": pokemon("pokemon-1", 110),
		"pokemon-2": pokemon("pokemon-2", 120)
	};
	updateFeatures(objects);
	expect(hasExpiredFeatures()).toBe(false);
	clock.now = 111;
	expect(hasExpiredFeatures()).toBe(true);
	updateFeatures(objects);
	expect(clock.updates.mock.lastCall![0]).toHaveLength(1);
	expect(hasExpiredFeatures()).toBe(false);
	clock.now = 121;
	expect(hasExpiredFeatures()).toBe(true);
	updateFeatures(objects);
	expect(clock.updates.mock.lastCall![0]).toHaveLength(0);
	expect(hasExpiredFeatures()).toBe(false);
});
it("refreshes a changed payload without requiring movement", () => {
	const first = pokemon("pokemon-1", 120);
	updateFeatures({ "pokemon-1": first });
	updateFeatures({ "pokemon-1": { ...first, pokemon_id: 26 } });
	expect(clock.updates.mock.lastCall![0][0].properties.imageId).toBe("26");
});
