const { spawnSync } = require("child_process");
const path = require("path");

const validRelease = /^(patch|minor|major|\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;

function deploy(release = "patch", runCommand = run) {
    if (!isValidRelease(release)) {
        throw new Error(`Invalid release "${release}". Use patch, minor, major or an explicit semver.`);
    }

    runCommand("npm", ["run", "check"]);
    runCommand(vsceExecutable(), ["publish", release, "--message", "chore(release): %s"]);
}

function isValidRelease(release) {
    return validRelease.test(release);
}

function vsceExecutable(platform = process.platform) {
    return path.join(
        __dirname,
        "..",
        "node_modules",
        ".bin",
        platform === "win32" ? "vsce.cmd" : "vsce"
    );
}

function run(command, args, spawn = spawnSync, platform = process.platform) {
    const result = spawn(command, args, {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
        shell: platform === "win32" && (command === "npm" || command.endsWith(".cmd"))
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`Command failed with exit code ${result.status || 1}: ${command}`);
    }
}

function main(args = process.argv.slice(2), logger = console, deployAction = deploy) {
    try {
        deployAction(args[0]);
        return 0;
    } catch (error) {
        logger.error(error.message);
        return 1;
    }
}

if (require.main === module) {
    process.exitCode = main();
}

module.exports = { deploy, isValidRelease, main, run, vsceExecutable };
