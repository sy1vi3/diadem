import type { HomepageMetric } from "@/lib/homepage/types";

/** Coalesce requests and serve the last count while refreshing it in the background. */
export class CountCache {
	private entries = new Map<
		string,
		{ value: number | null; updated: number; retryAt: number; pending?: Promise<void> }
	>();
	async get(
		key: string,
		ttl: number,
		maxAge: number,
		load: () => Promise<number>,
		now = Date.now()
	): Promise<HomepageMetric> {
		let entry = this.entries.get(key);
		if (!entry) {
			entry = { value: null, updated: 0, retryAt: 0 };
			this.entries.set(key, entry);
		}
		if (now >= entry.retryAt && now - entry.updated >= ttl && !entry.pending) {
			const target = entry;
			target.pending = load()
				.then((value) => {
					if (!Number.isFinite(value) || value < 0) throw new Error("Invalid count");
					target.value = value;
					target.updated = now;
					target.retryAt = now + ttl;
				})
				.catch(() => {
					target.retryAt = now + 30000;
				})
				.finally(() => {
					target.pending = undefined;
				});
		}
		if (entry.value === null) await entry.pending;
		const validUntil = entry.updated + maxAge;
		return {
			value: now < validUntil ? entry.value : null,
			updatedAt: entry.updated ? new Date(entry.updated).toISOString() : null,
			stale: entry.value !== null && now - entry.updated >= ttl,
			validUntil
		};
	}
}
