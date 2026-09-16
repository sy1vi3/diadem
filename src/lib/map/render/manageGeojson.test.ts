import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
	map: undefined as any,
	loads: [] as (() => void)[],
	updates: vi.fn()
}));
vi.mock("@/lib/map/map.svelte.js", () => ({ getMap: () => state.map }));
vi.mock("@/lib/map/layers", () => ({
	MapSourceId: { MAP_OBJECTS: "objects" },
	updateMapGeojsonSource: state.updates
}));
vi.mock("@/lib/map/render/featureTypes", () => ({ isFeatureIcon: () => true }));
vi.mock("@/lib/map/render/images", () => ({
	getMapImageId: (p: any) => p.imageId,
	ensureMapImage: (map: any, p: any) =>
		new Promise<void>((resolve) =>
			state.loads.push(() => {
				map.images.add(p.imageId);
				resolve();
			})
		)
}));
import { updateMapObjectsGeoJson } from "./manageGeojson";
const features = (prefix: string, count = 20) =>
	Array.from({ length: count }, (_, i) => ({
		properties: { imageId: prefix + i, imageUrl: "/icon" }
	})) as any;
beforeEach(() => {
	vi.useFakeTimers();
	state.loads = [];
	state.updates.mockClear();
	state.map = {
		images: new Set(),
		hasImage(id: string) {
			return this.images.has(id);
		}
	};
});
afterEach(() => vi.useRealTimers());
it("coalesces completions while continuing to show later batches", async () => {
	updateMapObjectsGeoJson(features("a"));
	expect(state.updates).toHaveBeenCalledTimes(1);
	state.loads.slice(0, 10).forEach((resolve) => resolve());
	await vi.advanceTimersByTimeAsync(32);
	expect(state.updates).toHaveBeenCalledTimes(2);
	expect(state.updates.mock.lastCall![2].features).toHaveLength(10);
	state.loads.slice(10).forEach((resolve) => resolve());
	await vi.advanceTimersByTimeAsync(32);
	expect(state.updates).toHaveBeenCalledTimes(3);
	expect(state.updates.mock.lastCall![2].features).toHaveLength(20);
});
it("renders latest viewport after pending loads, never restores stale features", async () => {
	updateMapObjectsGeoJson(features("old"));
	state.loads.forEach((resolve) => resolve());
	updateMapObjectsGeoJson(features("new", 1));
	state.loads.at(-1)!();
	await vi.advanceTimersByTimeAsync(32);
	expect(state.updates.mock.lastCall![2].features.map((f: any) => f.properties.imageId)).toEqual([
		"new0"
	]);
});
it("does not update a replaced map", async () => {
	updateMapObjectsGeoJson(features("old"));
	state.loads.forEach((resolve) => resolve());
	state.map = undefined;
	await vi.advanceTimersByTimeAsync(32);
	expect(state.updates).toHaveBeenCalledTimes(1);
});

it("does not update a removed map while a batch is scheduled", async () => {
	updateMapObjectsGeoJson(features("a"));
	state.loads.forEach((resolve) => resolve());
	await vi.advanceTimersByTimeAsync(1);
	state.map._removed = true;
	await vi.advanceTimersByTimeAsync(32);
	expect(state.updates).toHaveBeenCalledTimes(1);
});
