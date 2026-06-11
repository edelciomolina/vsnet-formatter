const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const requiredFiles = [
    "extension.js",
    "lib/formatter.js",
    "format-with-visual-studio.ps1",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "icon.png"
];

for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(root, file))) {
        fail(`Required file is missing: ${file}`);
    }
}

for (const field of ["name", "displayName", "description", "version", "publisher", "repository", "license"]) {
    if (!manifest[field]) {
        fail(`Required package.json field is missing: ${field}`);
    }
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    fail(`Invalid extension version: ${manifest.version}`);
}

if (!Array.isArray(manifest.categories) || !manifest.categories.includes("Formatters")) {
    fail('The extension must include the "Formatters" Marketplace category.');
}

const configurationDefaults = manifest.contributes?.configurationDefaults;
if (configurationDefaults?.["css.format.enable"] !== false) {
    fail('The extension must disable the built-in CSS formatter by default.');
}

if (configurationDefaults?.["[css]"]?.["editor.defaultFormatter"] !== `${manifest.publisher}.${manifest.name}`) {
    fail("The extension must configure itself as the default CSS formatter.");
}

const scriptPath = path.join(root, "format-with-visual-studio.ps1").replaceAll("'", "''");
const powershell = spawnSync(
    "powershell.exe",
    [
        "-NoProfile",
        "-Command",
        `$errors = $null; [System.Management.Automation.Language.Parser]::ParseFile('${scriptPath}', [ref]$null, [ref]$errors) | Out-Null; if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }`
    ],
    { stdio: "inherit" }
);

if (powershell.error) {
    throw powershell.error;
}

if (powershell.status !== 0) {
    process.exit(powershell.status || 1);
}

console.log(`Validated ${manifest.publisher}.${manifest.name}@${manifest.version}`);

function fail(message) {
    console.error(message);
    process.exit(1);
}
