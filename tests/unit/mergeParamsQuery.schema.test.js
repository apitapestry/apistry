import { describe, expect, test } from "vitest";
import { mergeParamsQuery } from "../../src/utils/helpers.js";

function makeReq({ query = {}, params = {}, schema = {} } = {}) {
    return {
        query,
        params,
        routeOptions: {
            schema
        }
    };
}

describe("mergeParamsQuery(includeSchema)", () => {
    test("returns schema hints for querystring properties", () => {
        const req = makeReq({
            query: { code: "3", limit: "10" },
            schema: {
                querystring: {
                    properties: {
                        code: { type: "string" },
                        limit: { type: "integer" }
                    }
                }
            }
        });

        const merged = mergeParamsQuery(req, undefined, true, { includeSchema: true });
        expect(merged).toHaveProperty("query");
        expect(merged).toHaveProperty("schema");

        // option keys removed from query/schema
        expect(merged.query).toEqual({ code: "3" });
        expect(merged.schema).toEqual({ code: { schemaType: "string", schemaFormat: undefined } });
    });

    test("includes params schema hints too", () => {
        const req = makeReq({
            query: {},
            params: { id: "3" },
            schema: {
                params: {
                    properties: {
                        id: { type: "string" }
                    }
                }
            }
        });

        const merged = mergeParamsQuery(req, undefined, true, { includeSchema: true });
        expect(merged.query).toEqual({ id: "3" });
        expect(merged.schema).toEqual({ id: { schemaType: "string", schemaFormat: undefined } });
    });
});

