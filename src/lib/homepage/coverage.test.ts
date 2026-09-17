import { expect, it } from "vitest";
import type { KojiFeature } from "../features/koji";
import { regionalCoverage } from "./coverage";
it("keeps selected descendants and menu ancestors without siblings or shared-state mutation", () => {
	const source = [
		[1, "World", null],
		[2, "North", "World"],
		[3, "South", "World"],
		[4, "Town", "North"]
	].map(([id, name, parent]) => ({
		type: "Feature",
		geometry: { type: "Polygon", coordinates: [] },
		properties: { id, name, parent, parentName: parent, children: [] }
	})) as KojiFeature[];
	const before = structuredClone(source);
	expect(regionalCoverage(source, [2]).map((f) => f.properties.id)).toEqual([2, 4]);
	const menu = regionalCoverage(source, [2], true);
	expect(menu.map((f) => f.properties.id)).toEqual([1, 2, 4]);
	expect(menu[0].properties.children.map((f) => f.properties.id)).toEqual([2]);
	expect(source).toEqual(before);
	expect(regionalCoverage(source, [99])).toEqual([]);
});
