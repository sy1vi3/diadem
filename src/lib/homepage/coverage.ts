import type { KojiFeature } from "../features/koji";

/** Copies the hierarchy for presentation without mutating shared permission geofences. */
export function regionalCoverage(
	features: KojiFeature[],
	ids: number[],
	includeAncestors = false
): KojiFeature[] {
	if (!ids.length) return features;
	const selected = new Set(
		features.filter((f) => ids.includes(f.properties.id)).map((f) => f.properties.name)
	);
	let previous = -1;
	while (previous !== selected.size) {
		previous = selected.size;
		for (const feature of features) {
			if (feature.properties.parent && selected.has(feature.properties.parent))
				selected.add(feature.properties.name);
		}
	}
	if (includeAncestors) {
		const byName = new Map(features.map((feature) => [feature.properties.name, feature]));
		for (const name of selected) {
			const parent = byName.get(name)?.properties.parent;
			if (parent && byName.has(parent)) selected.add(parent);
		}
	}
	const copies = features
		.filter((f) => selected.has(f.properties.name))
		.map((f) => ({
			...f,
			properties: { ...f.properties, children: [] as KojiFeature[] }
		}));
	const byName = new Map(copies.map((f) => [f.properties.name, f]));
	for (const feature of copies) {
		const parent = byName.get(feature.properties.parent ?? "");
		if (parent) parent.properties.children.push(feature);
		else {
			feature.properties.parent = null;
			feature.properties.parentName = null;
		}
	}
	return copies;
}
