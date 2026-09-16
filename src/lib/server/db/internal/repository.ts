import { getSiteOrigin } from "@/lib/services/config/config.server";
import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import { eq, sql } from "drizzle-orm";
import type { UserSettings } from "$lib/services/userSettings.svelte";

const settingsDocument = sql`CASE
 WHEN JSON_TYPE(${table.user.userSettings}) = 'STRING'
 THEN JSON_EXTRACT(JSON_UNQUOTE(${table.user.userSettings}), '$')
 ELSE COALESCE(${table.user.userSettings}, '{}') END`;

// JSON_SET does not create missing intermediate objects.
const settingsWithSites = sql`JSON_SET(${settingsDocument}, '$.sites', COALESCE(JSON_EXTRACT(${settingsDocument}, '$.sites'), JSON_OBJECT()))`;

export async function setUserSettings(userId: string, userSettings: unknown) {
	const origin = getSiteOrigin();
	if (!origin) {
		await db
			.update(table.user)
			.set({
				userSettings: sql`JSON_SET(JSON_EXTRACT(${JSON.stringify(userSettings)}, '$'), '$.sites', COALESCE(JSON_EXTRACT(${settingsDocument}, '$.sites'), JSON_OBJECT()))`
			})
			.where(eq(table.user.id, userId));
		return;
	}
	await db
		.update(table.user)
		.set({
			userSettings: sql`JSON_SET(${settingsWithSites}, ${`$.sites.${JSON.stringify(origin)}`}, JSON_EXTRACT(${JSON.stringify(userSettings)}, '$'))`
		})
		.where(eq(table.user.id, userId));
}

export async function getUserSettings(userId: string): Promise<unknown> {
	const [result] = await db
		.select({ user: { userSettings: table.user.userSettings } })
		.from(table.user)
		.where(eq(table.user.id, userId));

	const raw = result?.user?.userSettings;
	const settings = typeof raw === "string" ? JSON.parse(raw) : raw;
	const origin = getSiteOrigin();
	if (origin) return (settings as { sites?: Record<string, unknown> } | null)?.sites?.[origin];
	if (!settings || typeof settings !== "object") return settings;
	const { sites: _sites, ...baseSettings } = settings as Record<string, unknown>;
	return baseSettings;
}

export async function setUserMapPosition(
	userId: string,
	mapPosition: UserSettings["mapPosition"]
): Promise<void> {
	const origin = getSiteOrigin();
	await db
		.update(table.user)
		.set({
			userSettings: origin
				? sql`JSON_SET(${settingsWithSites}, ${`$.sites.${JSON.stringify(origin)}`}, JSON_MERGE_PATCH(COALESCE(JSON_EXTRACT(${settingsDocument}, ${`$.sites.${JSON.stringify(origin)}`}), '{}'), ${JSON.stringify({ mapPosition })}))`
				: sql`JSON_SET(${settingsDocument}, '$.mapPosition', JSON_EXTRACT(${JSON.stringify(mapPosition)}, '$'))`
		})
		.where(eq(table.user.id, userId));
}
