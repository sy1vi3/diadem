/** Compare decoded map payloads (primitives, arrays and plain records).
 * Scanner timestamps alone cannot prove that nested or permission-filtered data is unchanged.
 */
export function sameMapObject(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
	if (Array.isArray(a)) {
		return (
			Array.isArray(b) && a.length === b.length && a.every((value, i) => sameMapObject(value, b[i]))
		);
	}
	if (Array.isArray(b)) return false;
	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => Object.hasOwn(right, key) && sameMapObject(left[key], right[key]))
	);
}
