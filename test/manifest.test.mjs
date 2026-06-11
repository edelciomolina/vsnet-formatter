import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const manifestPath = path.join(import.meta.dirname, "..", "package.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

describe("extension manifest", () => {
    it("is discoverable through the VS Code Formatters category filter", () => {
        expect(manifest.categories).toContain("Formatters");
    });

    it("uses formatter-related Marketplace keywords", () => {
        expect(manifest.keywords).toEqual(expect.arrayContaining(["formatter", "css"]));
    });

    it("works as the default CSS formatter without manual configuration", () => {
        const defaults = manifest.contributes.configurationDefaults;

        expect(defaults["css.format.enable"]).toBe(false);
        expect(defaults["[css]"]["editor.defaultFormatter"]).toBe(
            `${manifest.publisher}.${manifest.name}`
        );
    });
});
