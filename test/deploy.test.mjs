import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import deployModule from "../scripts/deploy.js";

const { deploy, bumpVersion, checkPrerequisites, isValidRelease, main, run, vsceExecutable } = deployModule;

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

describe("bumpVersion", () => {
    it("bumps patch", () => expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4"));
    it("bumps minor", () => expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0"));
    it("bumps major", () => expect(bumpVersion("1.2.3", "major")).toBe("2.0.0"));
    it("uses explicit version as-is", () => expect(bumpVersion("1.2.3", "4.5.6")).toBe("4.5.6"));
});

describe("checkPrerequisites", () => {
    it("succeeds when vsce PAT is valid", () => {
        const spawn = vi.fn(() => ({ status: 0 }));
        expect(() => checkPrerequisites(spawn)).not.toThrow();
    });

    it("throws when vsce PAT is not configured", () => {
        const spawn = vi.fn(() => ({ status: 1 }));
        expect(() => checkPrerequisites(spawn)).toThrow("Not logged in to vsce");
    });
});

describe("deploy", () => {
    const noGit = vi.fn().mockResolvedValue("n");

    it("runs check and publishes a minor release by default", async () => {
        const runCommand = vi.fn();

        await deploy(undefined, runCommand, noGit);

        expect(runCommand).toHaveBeenNthCalledWith(1, "npm", ["run", "check"]);
        expect(runCommand).toHaveBeenNthCalledWith(
            2,
            expect.stringMatching(/vsce(?:\.cmd)?$/),
            ["publish", "minor", "--no-git-tag-version"]
        );
    });

    it("publishes the requested valid release", async () => {
        const runCommand = vi.fn();

        await deploy("patch", runCommand, noGit);

        expect(runCommand).toHaveBeenNthCalledWith(
            2,
            expect.any(String),
            ["publish", "patch", "--no-git-tag-version"]
        );
    });

    it("runs git commands when user accepts", async () => {
        const runCommand = vi.fn();
        const yesGit = vi.fn().mockResolvedValue("");

        await deploy("patch", runCommand, yesGit);

        expect(runCommand).toHaveBeenCalledWith("git", ["add", "."]);
        expect(runCommand).toHaveBeenCalledWith("git", expect.arrayContaining(["commit"]));
        expect(runCommand).toHaveBeenCalledWith("git", expect.arrayContaining(["tag"]));
        expect(runCommand).toHaveBeenCalledWith("git", ["push", "--follow-tags"]);
    });

    it("skips git commands when user declines", async () => {
        const runCommand = vi.fn();

        await deploy("patch", runCommand, noGit);

        expect(runCommand).not.toHaveBeenCalledWith("git", expect.anything());
    });

    it("rejects invalid releases without running commands", async () => {
        const runCommand = vi.fn();

        await expect(deploy("invalid", runCommand, noGit)).rejects.toThrow("Invalid release");
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
    it("returns success after deployment", async () => {
        const deployAction = vi.fn();
        const logger = { error: vi.fn() };

        expect(await main(["minor"], logger, deployAction)).toBe(0);
        expect(deployAction).toHaveBeenCalledWith("minor");
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("reports deployment failures", async () => {
        const deployAction = vi.fn(() => {
            throw new Error("publish failed");
        });
        const logger = { error: vi.fn() };

        expect(await main([], logger, deployAction)).toBe(1);
        expect(logger.error).toHaveBeenCalledWith("publish failed");
    });
});
