/**
 * Integration test: reads real files from postgres-mcp/temp, corrupts each one
 * with a leading TAB on the first non-empty line, runs the actual PowerShell
 * formatter (requires Visual Studio installed), and verifies the result matches
 * the original content.
 *
 * Usage:  node scripts/test-integration.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { createFormatDocument } = require("../lib/formatter");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TEMP_DIR = path.resolve(__dirname, "../../postgres-mcp/temp");
const SCRIPT = path.resolve(__dirname, "../format-with-visual-studio.ps1");

const EXT_TO_LANGUAGE = {
    ".css": "css",
    ".html": "html",
    ".js": "javascript",
    ".aspx": "aspnet"
};

// ---------------------------------------------------------------------------
// Minimal VS Code API stubs
// ---------------------------------------------------------------------------

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

const TextEdit = {
    replace: (range, newText) => ({ range, newText })
};

function createVscodeStub() {
    return {
        workspace: {
            getConfiguration: () => ({
                get: (_key, defaultValue) => defaultValue
            })
        },
        Range,
        Position,
        TextEdit
    };
}

function createDocumentStub(filePath, content) {
    const lines = content.split(/\r?\n/);
    return {
        fileName: filePath,
        languageId: EXT_TO_LANGUAGE[path.extname(filePath)] ?? "css",
        uri: { fsPath: filePath },
        getText: () => content,
        lineCount: lines.length,
        lineAt: (lineIndex) => {
            const text = lines[lineIndex] ?? "";
            // rangeIncludingLineBreak.end sits just past the newline
            const endChar = text.length + 1;
            return {
                rangeIncludingLineBreak: {
                    end: new Position(lineIndex, endChar)
                }
            };
        }
    };
}

// ---------------------------------------------------------------------------
// Console output channel (mirrors VS Code OutputChannel interface)
// ---------------------------------------------------------------------------

const outputChannel = {
    appendLine: (msg) => console.log(`  ${msg}`),
    show: () => { }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corruptContent(original) {
    // Add a TAB before the first non-empty line to break indentation
    return original.replace(/^(\s*\S)/m, "\t$1");
}

function firstDiff(a, b) {
    const aLines = a.split(/\r?\n/);
    const bLines = b.split(/\r?\n/);
    const len = Math.max(aLines.length, bLines.length);
    for (let i = 0; i < len; i++) {
        if (aLines[i] !== bLines[i]) {
            return {
                line: i + 1,
                original: aLines[i],
                formatted: bLines[i]
            };
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

async function testFile(filePath) {
    const basename = path.basename(filePath);
    const original = fs.readFileSync(filePath, "utf8");
    const corrupted = corruptContent(original);

    console.log(`\n[ ${basename} ]`);
    if (corrupted === original) {
        console.log("  SKIP – could not produce a meaningful corruption (file may be empty)");
        return null;
    }

    const document = createDocumentStub(filePath, corrupted);

    const formatDocument = createFormatDocument({
        vscode: createVscodeStub(),
        script: SCRIPT,
        platform: "win32",
        outputChannel
    });

    try {
        const edits = await formatDocument(document);

        if (edits.length === 0) {
            console.log("  RESULT: FAIL – formatter returned no edits (content unchanged after PS1 ran)");
            return false;
        }

        const formatted = edits[0].newText;
        const passed = formatted === original;

        if (passed) {
            console.log("  RESULT: PASS – formatter restored the original content");
        } else {
            console.log("  RESULT: FAIL – formatter output differs from original");
            const diff = firstDiff(original, formatted);
            if (diff) {
                console.log(`    First diff at line ${diff.line}:`);
                console.log(`      expected:  ${JSON.stringify(diff.original)}`);
                console.log(`      received:  ${JSON.stringify(diff.formatted)}`);
            }
        }

        return passed;
    } catch (err) {
        console.log(`  RESULT: ERROR – ${err.message}`);
        return false;
    }
}

async function main() {
    console.log("=".repeat(60));
    console.log("DotNet Formatter – Integration Test");
    console.log("=".repeat(60));
    console.log(`Test files : ${TEMP_DIR}`);
    console.log(`PS1 script : ${SCRIPT}`);

    if (!fs.existsSync(TEMP_DIR)) {
        console.error(`\nERROR: temp directory not found: ${TEMP_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(TEMP_DIR)
        .filter(f => EXT_TO_LANGUAGE[path.extname(f)] !== undefined)
        .map(f => path.join(TEMP_DIR, f));

    if (files.length === 0) {
        console.log("\nNo supported files (.css / .html / .js / .aspx) found.");
        process.exit(0);
    }

    const results = [];
    for (const file of files) {
        const passed = await testFile(file);
        if (passed !== null) {
            results.push({ file: path.basename(file), passed });
        }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("Summary:");
    for (const { file, passed } of results) {
        console.log(`  ${passed ? "PASS" : "FAIL"}  ${file}`);
    }

    const allPassed = results.every(r => r.passed);
    console.log(`\nOverall: ${allPassed ? "ALL TESTS PASSED" : "ONE OR MORE TESTS FAILED"}`);

    if (!allPassed) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error("\nFatal error:", err);
    process.exit(1);
});
