import { describe, expect, it, vi } from "vitest";
import { SightingFeed } from "./sightings";
import { regionalCountQuery, countRegionalRows, type Area } from "./counts";
const area: Area = {
	type: "Feature",
	properties: { id: 1, name: "Town" },
	geometry: {
		type: "Polygon",
		coordinates: [
			[
				[0, 0],
				[2, 0],
				[2, 2],
				[0, 2],
				[0, 0]
			]
		]
	}
};
const rules = { minIv: 90, species: [443], intervalSeconds: 45 };
const now = 1800000000000;
const spawn = {
	encounter_id: "private-id",
	pokemon_id: 443,
	latitude: 1,
	longitude: 1,
	disappear_time: now / 1000 + 300,
	individual_attack: 15,
	individual_defense: 15,
	individual_stamina: 15,
	username: "private-name"
};
describe("public sighting feed", () => {
	it("filters geometry, deduplicates updates and strips scanner fields", () => {
		const feed = new SightingFeed(
			rules,
			() => [area],
			() => "Gible",
			() => "/icon.png"
		);
		feed.ingest({ ...spawn, latitude: 3 }, now);
		expect(feed.take(now)).toBeUndefined();
		feed.ingest(spawn, now);
		feed.ingest({ ...spawn, individual_attack: 14 }, now);
		const event = feed.take(now)!;
		expect(event.name).toBe("Gible");
		expect(event.iv).toBe(100);
		expect(event.ivs).toEqual([15, 15, 15]);
		expect(event.mapsUrl).toBe("https://www.google.com/maps/search/?api=1&query=1,1");
		expect(JSON.stringify(event)).not.toContain("private");
		expect(event).not.toHaveProperty("latitude");
		expect(feed.take(now + 46000)).toBeUndefined();
	});
	it("enforces cadence and drops expired candidates", () => {
		const feed = new SightingFeed(
			rules,
			() => [area],
			() => "Gible",
			() => ""
		);
		feed.ingest(spawn, now);
		expect(feed.take(now)).toBeDefined();
		feed.ingest({ ...spawn, encounter_id: "other", disappear_time: now / 1000 + 40 }, now);
		expect(feed.take(now + 1000)).toBeUndefined();
		expect(feed.take(now + 46000)).toBeUndefined();
	});
	it("rejects invalid stats and avoids fabricated percentages for unencountered Pokémon", () => {
		const feed = new SightingFeed(
			rules,
			() => [area],
			() => "Gible",
			() => ""
		);
		feed.ingest({ ...spawn, individual_attack: 99 }, now);
		expect(feed.take(now)).toBeUndefined();
		feed.ingest({ ...spawn, individual_attack: null }, now);
		expect(feed.take(now)?.iv).toBeNull();
	});
});
it("counts unique forts across overlapping polygons with bounded parameterized predicates", () => {
	const query = regionalCountQuery("gym", [area, area]);
	expect(query.sql).toContain("SELECT id, lat, lon");
	expect(query.sql).toContain("deleted = 0");
	expect(query.values.length).toBe(8);
	expect(query.sql).not.toContain("Town");
	expect(() => regionalCountQuery("gym", [])).toThrow();
});
it("counts a fort once across overlapping polygons and excludes holes", async () => {
	const hole: Area = structuredClone(area);
	hole.geometry = {
		type: "Polygon",
		coordinates: [
			area.geometry.coordinates[0] as number[][],
			[
				[0.5, 0.5],
				[1.5, 0.5],
				[1.5, 1.5],
				[0.5, 1.5],
				[0.5, 0.5]
			]
		]
	};
	expect(
		await countRegionalRows(
			[
				{ lat: 1, lon: 1 },
				{ lat: 0.1, lon: 0.1 },
				{ lat: 3, lon: 3 }
			],
			[hole, hole]
		)
	).toBe(1);
});

it("coalesces count queries, refreshes stale counts, and backs off on errors", async () => {
	const { CountCache } = await import("./cache");
	const cache = new CountCache();
	const load = vi.fn(async () => 42);
	const read = (time: number) => cache.get("phoenix:gyms", 60000, 3600000, load, time);
	expect((await Promise.all([read(now), read(now)])).map((x) => x.value)).toEqual([42, 42]);
	expect(load).toHaveBeenCalledTimes(1);
	await read(now + 1000);
	expect(load).toHaveBeenCalledTimes(1);
	load.mockRejectedValue(new Error("offline"));
	expect(await read(now + 61000)).toMatchObject({ value: 42, stale: true });
	await Promise.resolve();
	await Promise.resolve();
	expect((await read(now + 62000)).value).toBe(42);
	expect(load).toHaveBeenCalledTimes(2);
	expect((await read(now + 3600001)).value).toBeNull();
});

it("randomly samples 90%+ candidates, retaining regional filtering and cadence", () => {
	const feed = new SightingFeed(
		{ minIv: 90, species: [], intervalSeconds: 40 },
		() => [area],
		() => "Pokémon",
		() => ""
	);
	feed.ingest({ ...spawn, individual_attack: 10 }, now); // 40/45 is below 90%.
	expect(feed.take(now)).toBeUndefined();
	feed.ingest({ ...spawn, individual_attack: 11, gender: 2 }, now); // 41/45 qualifies.
	feed.ingest({ ...spawn, encounter_id: "second", individual_attack: 12, gender: 1 }, now);
	const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
	try {
		const selected = feed.take(now)!;
		expect(selected.ivs).toEqual([12, 15, 15]);
		expect(selected.gender).toBe(1);
		expect(feed.take(now + 39000)).toBeUndefined();
		expect(feed.take(now + 40000)?.ivs).toEqual([11, 15, 15]);
		expect(feed.take(now + 80000)).toBeUndefined();
	} finally {
		random.mockRestore();
	}
});
