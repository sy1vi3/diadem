import type { Feature, Polygon, MultiPolygon } from "geojson";
import { bbox, booleanPointInPolygon } from "@turf/turf";
export type Area = Feature<
	Polygon | MultiPolygon,
	{ id: number; name: string; parent?: string | null }
>;
export function regionalCountQuery(table: "gym" | "pokestop", areas: Area[]) {
	if (!areas.length) throw new Error("No region geometry available");
	const values: number[] = [];
	const polygons = areas.flatMap((area) =>
		area.geometry.type === "Polygon"
			? [area.geometry]
			: area.geometry.coordinates.map((coordinates) => ({ type: "Polygon" as const, coordinates }))
	);
	const clauses = polygons.map((polygon) => {
		const [west, south, east, north] = bbox(polygon);
		values.push(south, north, west, east);
		return `SELECT id, lat, lon FROM ${table} WHERE deleted = 0 AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?`;
	});
	// UNION deduplicates primary-key rows and lets each small polygon use the coordinate index.
	return {
		sql: `SELECT id, lat, lon FROM (${clauses.join(" UNION ")}) AS candidates LIMIT 1000001`,
		values
	};
}
export async function countRegionalRows(rows: { lat: number; lon: number }[], areas: Area[]) {
	if (rows.length > 1000000) throw new Error("Region candidate limit exceeded");
	const polygons = areas.flatMap((area) => {
		const coordinates =
			area.geometry.type === "Polygon" ? [area.geometry.coordinates] : area.geometry.coordinates;
		return coordinates.map((coordinates) => {
			const polygon = { type: "Polygon" as const, coordinates };
			return { polygon, bounds: bbox(polygon) };
		});
	});
	let count = 0;
	for (let i = 0; i < rows.length; i++) {
		const { lat, lon } = rows[i];
		if (
			polygons.some(
				({ polygon, bounds: [west, south, east, north] }) =>
					lon >= west &&
					lon <= east &&
					lat >= south &&
					lat <= north &&
					booleanPointInPolygon([lon, lat], polygon)
			)
		)
			count++;
		// Keep the server responsive while counting large regions.
		if (i % 1000 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
	}
	return count;
}
