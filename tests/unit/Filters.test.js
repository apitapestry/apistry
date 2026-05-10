import { describe, expect, test } from "vitest";
import { getFilter } from "../../src/utils/filters.js";

describe("mongo getFilter() type handling", () => {
    test("keeps numeric-looking string as string when schemaType is string", () => {
        expect(getFilter("age", "3", null, true, { schemaType: "string" })).toBe("3");
    });

    test("converts numeric-looking string to number when schemaType is number", () => {
        expect(getFilter("age", "3", null, true, { schemaType: "number" })).toBe(3);
    });

    test("falls back to heuristic conversion when no schemaType is provided", () => {
        expect(getFilter("age", "3")).toBe(3);
    });

    test("supports date-only comparisons using schema format", () => {
        const f = getFilter("created", "gte.2025-01-02", null, true, { schemaType: "string", schemaFormat: "date" });
        // Should use paddedStart ISO string
        expect(f).toHaveProperty("$gte");
        expect(String(f.$gte)).toContain("2025-01-02T00:00:00.000Z");
    });

    test("builds NeDB-compatible regex for wildcard queries", () => {
        const f = getFilter("vin", "3*123456");
        expect(f).toHaveProperty("$regex");
        expect(f.$regex).toBeInstanceOf(RegExp);
        expect(String(f.$regex)).toContain("^3.*123456$");
    });
});
