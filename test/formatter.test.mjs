import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import formatter from "../lib/formatter.js";

const {
    DEFAULT_PROG_ID,
    DEFAULT_TIMEOUT,
    createFormatDocument,
    executeFormatter,
    extensionForLanguage,
    stripBom
} = formatter;

describe("formatter utilities", () => {
    it("removes a leading BOM only", () => {
        expect(stripBom("\ufeffbody {}")).toBe("body {}");
        expect(stripBom("body {}")).toBe("body {}");
    });

    it("uses CSS as the fallback language extension", () => {
        expect(extensionForLanguage("css")).toBe(".css");
    });
});

describe("executeFormatter", () => {
    it("executes the PowerShell formatter with the expected arguments", async () => {
        const exec = vi.fn((command, args, options, callback) => callback(null, "", ""));

        await executeFormatter("formatter.ps1", "document.css", "VisualStudio.DTE.17.0", 5000, exec);

        expect(exec).toHaveBeenCalledWith(
            "powershell.exe",
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                "formatter.ps1",
                "-Path",
                "document.css",
                "-ProgId",
                "VisualStudio.DTE.17.0"
            ],
            { timeout: 5000, windowsHide: true },
            expect.any(Function)
        );
    });

    it.each([
        ["stderr output", "", "stderr output"],
        ["stdout output", "stdout output", ""],
        ["process failed", "", ""]
    ])("reports the best available process error: %s", async (expected, stdout, stderr) => {
        const exec = vi.fn((command, args, options, callback) => {
            callback(new Error("process failed"), stdout, stderr);
        });

        await expect(executeFormatter("formatter.ps1", "document.css", "DTE", 5000, exec))
            .rejects.toThrow(expected);
    });
});

describe("createFormatDocument", () => {
    it("rejects unsupported operating systems before creating temporary files", async () => {
        const fileSystem = { mkdtempSync: vi.fn() };
        const formatDocument = createFormatDocument({
            vscode: createVscode(),
            script: "formatter.ps1",
            platform: "linux",
            fileSystem
        });

        await expect(formatDocument(createDocument("body {}"))).rejects.toThrow(
            "requires Windows and Visual Studio"
        );
        expect(fileSystem.mkdtempSync).not.toHaveBeenCalled();
    });

    it("returns no edits when Visual Studio does not change the document", async () => {
        let tempFile;
        const execute = vi.fn(async (script, file, progId, timeout) => {
            tempFile = file;
            expect(script).toBe("formatter.ps1");
            expect(progId).toBe(DEFAULT_PROG_ID);
            expect(timeout).toBe(DEFAULT_TIMEOUT);
        });
        const formatDocument = createFormatDocument({
            vscode: createVscode(),
            script: "formatter.ps1",
            platform: "win32",
            execute
        });

        await expect(formatDocument(createDocument("body {}"))).resolves.toEqual([]);
        expect(fs.existsSync(path.dirname(tempFile))).toBe(false);
    });

    it("returns a full document edit, strips BOM, and honors workspace settings", async () => {
        let tempFile;
        const vscode = createVscode({
            visualStudioProgId: "VisualStudio.DTE.16.0",
            timeout: 45000
        });
        const execute = vi.fn(async (script, file, progId, timeout) => {
            tempFile = file;
            expect(path.extname(file)).toBe(".css");
            expect(progId).toBe("VisualStudio.DTE.16.0");
            expect(timeout).toBe(45000);
            fs.writeFileSync(file, "\ufeffbody {\r\n    color: red;\r\n}\r\n", "utf8");
        });
        const formatDocument = createFormatDocument({
            vscode,
            script: "formatter.ps1",
            platform: "win32",
            execute
        });

        const edits = await formatDocument(createDocument("body { color: red; }", "document"));

        expect(edits).toHaveLength(1);
        expect(edits[0].newText).toBe("body {\r\n    color: red;\r\n}\r\n");
        expect(edits[0].range.start).toEqual({ line: 0, character: 0 });
        expect(fs.existsSync(path.dirname(tempFile))).toBe(false);
    });

    it("removes temporary files when formatting fails", async () => {
        let tempFile;
        const execute = vi.fn(async (script, file) => {
            tempFile = file;
            throw new Error("Visual Studio failed");
        });
        const formatDocument = createFormatDocument({
            vscode: createVscode(),
            script: "formatter.ps1",
            platform: "win32",
            execute
        });

        await expect(formatDocument(createDocument("body {}"))).rejects.toThrow("Visual Studio failed");
        expect(fs.existsSync(path.dirname(tempFile))).toBe(false);
    });
});

function createDocument(text, fileName = "document.css") {
    return {
        fileName,
        languageId: "css",
        lineCount: text.split(/\r?\n/).length,
        uri: { scheme: "file" },
        getText: () => text,
        lineAt: () => ({
            rangeIncludingLineBreak: {
                end: { line: 0, character: text.length }
            }
        })
    };
}

function createVscode(settings = {}) {
    class Position {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    }

    class Range {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    }

    return {
        Position,
        Range,
        TextEdit: {
            replace: (range, newText) => ({ range, newText })
        },
        workspace: {
            getConfiguration: () => ({
                get: (key, fallback) => settings[key] ?? fallback
            })
        }
    };
}
