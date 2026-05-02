import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ajvOptions } from "./configPlugin.js";

export async function ajvPlugin(app) {
    // Use the same AJV options defined in getFastifyConfig
    const ajv = new Ajv(ajvOptions);

    addFormats(ajv, ["date", "uuid"]);

    ajv.addFormat("date-time", {
        type: "string",
        validate: (value) =>
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:\d{2}|Z)$/.test(value)
    });

    ajv.addKeyword("example");

    app.setValidatorCompiler(({ schema }) => ajv.compile(schema));
}
