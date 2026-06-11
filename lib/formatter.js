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
    execute = executeFormatter
}) {
    return async function formatDocument(document) {
        if (platform !== "win32") {
            throw new Error("VS.NET Web Formatter requires Windows and Visual Studio.");
        }

        const config = vscode.workspace.getConfiguration("vsnetWebFormatter", document.uri);
        const progId = config.get("visualStudioProgId", DEFAULT_PROG_ID);
        const timeout = config.get("timeout", DEFAULT_TIMEOUT);
        const extension = pathApi.extname(document.fileName) || extensionForLanguage(document.languageId);
        const tempDir = fileSystem.mkdtempSync(pathApi.join(operatingSystem.tmpdir(), "vsnet-web-formatter-"));
        const tempFile = pathApi.join(tempDir, `document${extension}`);
        const original = document.getText();

        try {
            fileSystem.writeFileSync(tempFile, original, "utf8");
            await execute(script, tempFile, progId, timeout);

            const formatted = stripBom(fileSystem.readFileSync(tempFile, "utf8"));
            if (formatted === original) {
                return [];
            }

            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange = new vscode.Range(
                new vscode.Position(0, 0),
                lastLine.rangeIncludingLineBreak.end
            );

            return [vscode.TextEdit.replace(fullRange, formatted)];
        } finally {
            fileSystem.rmSync(tempDir, { recursive: true, force: true });
        }
    };
}

function executeFormatter(script, file, progId, timeout, exec = execFile) {
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
                if (error) {
                    reject(new Error(stderr || stdout || error.message));
                    return;
                }

                resolve();
            }
        );
    });
}

function extensionForLanguage() {
    return ".css";
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
