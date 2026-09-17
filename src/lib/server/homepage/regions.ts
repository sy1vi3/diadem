import { area as geometryArea } from "@turf/turf";
import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
import type { Area } from "./counts";
let cached: Area[] = [];
let updated = 0;
let pending: Promise<void> | undefined;
export async function regionAreas(ids: number[], detailed = false): Promise<Area[]> {
	if (Date.now() - updated > 300000) {
		pending ??= (async () => {
			const data = await fetchKojiGeofences((input, init) =>
				fetch(input, { ...init, signal: AbortSignal.timeout(15000) })
			);
			if (!data) throw new Error("Homepage region geometry unavailable");
			cached = data;
			updated = Date.now();
		})().finally(() => {
			pending = undefined;
		});
		await pending;
	}
	const selected = cached.filter((a) => ids.includes(a.properties.id));
	if (selected.length !== ids.length) throw new Error("Homepage region geometry missing");
	if (!detailed) return selected;
	const names = new Set(selected.map((a) => a.properties.name));
	let previous = -1;
	while (previous !== names.size) {
		previous = names.size;
		for (const a of cached)
			if (a.properties.parent && names.has(a.properties.parent)) names.add(a.properties.name);
	}
	return cached
		.filter((a) => names.has(a.properties.name))
		.sort((a, b) => geometryArea(a) - geometryArea(b));
}
