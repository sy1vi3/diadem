import { describe, expect, it } from "vitest";
import { getIconFeature } from "./featureTypes";

const props = {
	id: "pokemon-1",
	imageUrl: "/assets/go/pokemon/1.png",
	imageSize: 1,
	selectedScale: 1,
	expires: null
};

describe("normalized map icons", () => {
	it("requests normalization and keeps normalized images out of the ordinary image cache", () => {
		const ordinary = getIconFeature("1", [0, 0], props);
		const normalized = getIconFeature("1", [0, 0], { ...props, normalize: true });
		expect(ordinary.properties.imageUrl).toBe(props.imageUrl + "?w=64");
		expect(normalized.properties.imageUrl).toBe(props.imageUrl + "?w=64&normalize=1");
		expect(normalized.properties.imageId).not.toBe(ordinary.properties.imageId);
	});

	it("preserves upstream's pre-sized and inline images", () => {
		for (const imageUrl of ["/assets/go/pokemon/1.png?w=64", "data:image/png;base64,abc"]) {
			expect(getIconFeature("1", [0, 0], { ...props, imageUrl }).properties.imageUrl).toBe(
				imageUrl
			);
		}
	});
});
