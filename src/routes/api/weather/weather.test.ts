import { beforeEach, describe, expect, it, vi } from "vitest";
import { decode, encode } from "@msgpack/msgpack";

const mocks = vi.hoisted(() => ({ allowed: true, query: vi.fn() }));
vi.mock("@/lib/server/auth/checkIfAuthed", () => ({
	hasFeatureAnywhereServer: () => mocks.allowed
}));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: mocks.query }));
vi.mock("@/lib/utils/logger", () => ({ getLogger: () => ({ error: vi.fn() }) }));
import { POST } from "./+server";

beforeEach(() => {
	mocks.allowed = true;
	mocks.query.mockReset();
});

describe("bulk weather", () => {
	it.each([false, true])(
		"accepts and returns the current transport format (msgpack=%s)",
		async (binary) => {
			const body = { cellIds: ["-1234567890123456789", "1234567890123456789"] };
			const rows = [{ id: body.cellIds[0], gameplay_condition: 1 }];
			mocks.query.mockResolvedValue(rows);
			const contentType = binary ? "application/msgpack" : "application/json";
			const request = new Request("http://localhost/api/weather", {
				method: "POST",
				headers: { "Content-Type": contentType, Accept: contentType },
				body: binary ? encode(body) : JSON.stringify(body)
			});
			const response = await POST({ request, locals: {} } as Parameters<typeof POST>[0]);
			expect(mocks.query).toHaveBeenCalledWith(
				expect.stringContaining("WHERE id IN (?,?)"),
				body.cellIds
			);
			expect(
				binary ? decode(new Uint8Array(await response.arrayBuffer())) : await response.json()
			).toEqual(rows);
		}
	);

	it("checks weather permission before querying", async () => {
		mocks.allowed = false;
		await expect(
			POST({
				request: new Request("http://localhost/api/weather", { method: "POST", body: "{}" }),
				locals: {}
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({ status: 401 });
		expect(mocks.query).not.toHaveBeenCalled();
	});
});
