import { randomUUID } from "node:crypto";
import { booleanPointInPolygon } from "@turf/turf";
import { z } from "zod";
import type { HomepageServerConfig } from "@/lib/homepage/config";
import type { HomepageSighting } from "@/lib/homepage/types";
import type { Area } from "./counts";
const iv = z.number().int().min(0).max(15).nullable().optional();
export const sightingSchema = z.object({
	encounter_id: z.string().min(1).max(64),
	pokemon_id: z.number().int().min(1).max(10000),
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	disappear_time: z.number().int().positive(),
	form: z.number().int().nonnegative().nullable().optional(),
	gender: z.number().int().min(0).max(3).nullable().optional(),
	individual_attack: iv,
	individual_defense: iv,
	individual_stamina: iv
});
export class SightingFeed {
	private seen = new Map<string, number>();
	private candidates = new Map<string, HomepageSighting>();
	private lastSent = 0;
	constructor(
		private rules: HomepageServerConfig["regions"][number]["sightings"],
		private areas: () => Area[],
		private name: (id: number) => string,
		private icon: (id: number, form: number) => string
	) {}
	ingest(raw: unknown, now = Date.now()) {
		const result = sightingSchema.safeParse(raw);
		if (!result.success) return;
		const data = result.data;
		const expiresAt = data.disappear_time * 1000;
		if (expiresAt <= now + 10000 || expiresAt > now + 2 * 3600000) return;
		const values = [data.individual_attack, data.individual_defense, data.individual_stamina];
		const sum = values.every((v) => v != null) ? values.reduce<number>((a, b) => a + b!, 0) : null;
		if (
			!(sum !== null && (sum / 45) * 100 >= this.rules.minIv) &&
			!this.rules.species.includes(data.pokemon_id)
		)
			return;
		this.prune(now);
		if (this.seen.has(data.encounter_id)) return;
		const area = this.areas().find((area) =>
			booleanPointInPolygon([data.longitude, data.latitude], area)
		);
		if (!area || this.seen.size >= 10000) return;
		this.seen.set(data.encounter_id, expiresAt);
		if (this.candidates.size >= 100) this.candidates.delete(this.candidates.keys().next().value!);
		this.candidates.set(data.encounter_id, {
			id: randomUUID(),
			pokemonId: data.pokemon_id,
			form: data.form ?? 0,
			name: this.name(data.pokemon_id),
			icon: this.icon(data.pokemon_id, data.form ?? 0),
			iv: sum === null ? null : Math.round((sum / 45) * 100),
			ivs:
				sum === null
					? null
					: [data.individual_attack!, data.individual_defense!, data.individual_stamina!],
			gender: data.gender ?? null,
			mapsUrl: `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`,
			area: area.properties.name,
			expiresAt
		});
	}
	take(now = Date.now()) {
		this.prune(now);
		if (now - this.lastSent < this.rules.intervalSeconds * 1000 || !this.candidates.size) return;
		const entries = [...this.candidates.entries()];
		const [key, event] = entries[Math.floor(Math.random() * entries.length)];
		this.candidates.delete(key);
		this.lastSent = now;
		return event;
	}
	private prune(now: number) {
		for (const [key, expiry] of this.seen) if (expiry <= now) this.seen.delete(key);
		for (const [key, event] of this.candidates)
			if (event.expiresAt <= now + 8000) this.candidates.delete(key);
	}
}
