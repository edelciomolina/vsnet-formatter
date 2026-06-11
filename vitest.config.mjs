import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8",
            include: ["lib/**/*.js", "scripts/deploy.js"],
            reporter: [["text", { skipFull: false }], "html"],
            thresholds: {
                perFile: true,
                branches: 90,
                functions: 90,
                lines: 90,
                statements: 90
            }
        }
    }
});
