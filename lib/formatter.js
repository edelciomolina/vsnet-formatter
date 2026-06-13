const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const DEFAULT_PROG_ID = "VisualStudio.DTE.17.0";
const DEFAULT_TIMEOUT = 120000;

function createFormatDocument({
    vscode,
    script,
    platform = process.platform,
    fileSystem = fs,
    operatingSystem = os,
    pathApi = path,
    execute = executeFormatter,
    outputChannel = null
}) {
    const log = outputChannel
        ? msg => outputChannel.appendLine(`[${new Date().toISOString()}] ${msg}`)
        : () => { };

    return async function formatDocument(document) {
        if (platform !== "win32") {
            const msg = "DotNet Formatter requires Windows and Visual Studio.";
            log(`ERROR: ${msg}`);
            throw new Error(msg);
        }

        const config = vscode.workspace.getConfiguration("vsnetWebFormatter", document.uri);
        const progId = config.get("visualStudioProgId", DEFAULT_PROG_ID);
        const timeout = config.get("timeout", DEFAULT_TIMEOUT);
        const extension = pathApi.extname(document.fileName) || extensionForLanguage(document.languageId);

        log(`Formatting: ${document.fileName}`);
        log(`  ProgId: ${progId} | Timeout: ${timeout}ms | Extension: ${extension}`);

        const tempDir = fileSystem.mkdtempSync(pathApi.join(operatingSystem.tmpdir(), "vsnet-formatter-"));
        const tempFile = pathApi.join(tempDir, `document${extension}`);
        const original = document.getText();

        try {
            fileSystem.writeFileSync(tempFile, original, "utf8");
            log(`  Temp file: ${tempFile}`);
            log(`  Invoking PowerShell...`);

            await execute(script, tempFile, progId, timeout, undefined, log);

            const formatted = stripBom(fileSystem.readFileSync(tempFile, "utf8"));
            if (formatted === original) {
                log(`  No changes needed.`);
                return [];
            }

            log(`  Formatting applied successfully.`);
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange = new vscode.Range(
                new vscode.Position(0, 0),
                lastLine.rangeIncludingLineBreak.end
            );

            return [vscode.TextEdit.replace(fullRange, formatted)];
        } catch (err) {
            log(`  ERROR: ${err.message}`);
            outputChannel?.show(true);
            throw err;
        } finally {
            fileSystem.rmSync(tempDir, { recursive: true, force: true });
            log(`  Temp files cleaned up.`);
        }
    };
}

function executeFormatter(script, file, progId, timeout, exec = execFile, log = () => { }) {
    return new Promise((resolve, reject) => {
        exec(
            "powershell.exe",
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                script,
                "-Path",
                file,
                "-ProgId",
                progId
            ],
            { timeout, windowsHide: true },
            (error, stdout, stderr) => {
                if (stdout?.trim()) log(`  PowerShell stdout: ${stdout.trim()}`);
                if (stderr?.trim()) log(`  PowerShell stderr: ${stderr.trim()}`);

                if (error) {
                    reject(new Error(stderr || stdout || error.message));
                    return;
                }

                resolve();
            }
        );
    });
}

function extensionForLanguage(languageId) {
    const map = {
        html: ".html",
        javascript: ".js",
        aspnet: ".aspx"
    };
    return map[languageId] ?? ".css";
}

function stripBom(value) {
    return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

module.exports = {
    DEFAULT_PROG_ID,
    DEFAULT_TIMEOUT,
    createFormatDocument,
    executeFormatter,
    extensionForLanguage,
    stripBom
};
