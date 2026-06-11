const vscode = require("vscode");
const path = require("path");
const { createFormatDocument } = require("./lib/formatter");

const supportedLanguages = ["css"];

function activate(context) {
    const formatDocument = createFormatDocument({
        vscode,
        script: path.join(__dirname, "format-with-visual-studio.ps1")
    });
    const provider = {
        provideDocumentFormattingEdits: document => formatDocument(document)
    };

    for (const language of supportedLanguages) {
        context.subscriptions.push(
            vscode.languages.registerDocumentFormattingEditProvider({ language }, provider)
        );
    }
}

function deactivate() {}

module.exports = { activate, deactivate };
