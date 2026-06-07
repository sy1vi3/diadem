import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { query } from "@/lib/server/db/external/internalQuery";
import { Features } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import { error, json } from "@sveltejs/kit";

const log = getLogger("mapobjects");

const MAX_CELLS = 2000;

export async function POST({ request, locals }) {
	if (!hasFeatureAnywhereServer(locals.perms, Features.WEATHER, locals.user)) error(401);

	const body = await request.json().catch(() => null);
	const cellIds: unknown = body?.cellIds;
	if (!Array.isArray(cellIds) || cellIds.length === 0) return json([]);

	const ids = cellIds.slice(0, MAX_CELLS).map((id) => String(id));
	const placeholders = ids.map(() => "?").join(",");

	try {
		const result = await query(
			`SELECT CAST(id AS CHAR) AS id, latitude, longitude, gameplay_condition, updated FROM weather WHERE id IN (${placeholders})`,
			ids
		);
		return json(result);
	} catch (e) {
		log.error("[weather] bulk query failed", e);
		error(500);
	}
}
