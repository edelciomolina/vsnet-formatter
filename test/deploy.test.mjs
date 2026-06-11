import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import deployModule from "../scripts/deploy.js";

const { deploy, isValidRelease, main, run, vsceExecutable } = deployModule;

describe("release validation", () => {
    it.each(["patch", "minor", "major", "1.2.3", "1.2.3-beta.1"])(
        "accepts %s",
        release => expect(isValidRelease(release)).toBe(true)
    );

    it.each(["", "latest", "1.2", "v1.2.3", "1.2.3 beta"])(
        "rejects %s",
        release => expect(isValidRelease(release)).toBe(false)
    );
});

describe("deploy", () => {
    it("validates before publishing a minor release by default", () => {
        const runCommand = vi.fn();

        deploy(undefined, runCommand);

        expect(runCommand).toHaveBeenNthCalledWith(1, "npm", ["run", "check"]);
        expect(runCommand).toHaveBeenNthCalledWith(
            2,
            expect.stringMatching(/vsce(?:\.cmd)?$/),
            ["publish", "minor", "--message", "chore(release): %s"]
        );
    });

    it("publishes the requested valid release", () => {
        const runCommand = vi.fn();

        deploy("minor", runCommand);

        expect(runCommand).toHaveBeenLastCalledWith(
            expect.any(String),
            ["publish", "minor", "--message", "chore(release): %s"]
        );
    });

    it("rejects invalid releases without running commands", () => {
        const runCommand = vi.fn();

        expect(() => deploy("invalid", runCommand)).toThrow("Invalid release");
        expect(runCommand).not.toHaveBeenCalled();
    });
});

describe("vsceExecutable", () => {
    it("returns the Windows command shim on Windows", () => {
        expect(vsceExecutable("win32")).toBe(path.join(process.cwd(), "node_modules", ".bin", "vsce.cmd"));
    });

    it("returns the executable on other platforms", () => {
        expect(vsceExecutable("linux")).toBe(path.join(process.cwd(), "node_modules", ".bin", "vsce"));
    });
});

describe("run", () => {
    it("runs Windows command shims through the shell", () => {
        const spawn = vi.fn(() => ({ status: 0 }));

        run("vsce.cmd", ["--version"], spawn, "win32");

        expect(spawn).toHaveBeenCalledWith(
            "vsce.cmd",
            ["--version"],
            expect.objectContaining({ shell: true, stdio: "inherit" })
        );
    });

    it("does not use a shell for regular commands on other platforms", () => {
        const spawn = vi.fn(() => ({ status: 0 }));

        run("vsce", ["--version"], spawn, "linux");

        expect(spawn).toHaveBeenCalledWith(
            "vsce",
            ["--version"],
            expect.objectContaining({ shell: false })
        );
    });

    it("throws process startup errors", () => {
        const spawn = vi.fn(() => ({ error: new Error("spawn failed"), status: null }));

        expect(() => run("vsce", [], spawn, "linux")).toThrow("spawn failed");
    });

    it("throws when a command exits unsuccessfully", () => {
        const spawn = vi.fn(() => ({ status: 2 }));

        expect(() => run("vsce", [], spawn, "linux")).toThrow("exit code 2");
    });

    it("uses exit code 1 when the process does not provide a status", () => {
        const spawn = vi.fn(() => ({ status: null }));

        expect(() => run("vsce", [], spawn, "linux")).toThrow("exit code 1");
    });
});

describe("main", () => {
    it("returns success after deployment", () => {
        const deployAction = vi.fn();
        const logger = { error: vi.fn() };

        expect(main(["minor"], logger, deployAction)).toBe(0);
        expect(deployAction).toHaveBeenCalledWith("minor");
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("reports deployment failures", () => {
        const deployAction = vi.fn(() => {
            throw new Error("publish failed");
        });
        const logger = { error: vi.fn() };

        expect(main([], logger, deployAction)).toBe(1);
        expect(logger.error).toHaveBeenCalledWith("publish failed");
    });
});
