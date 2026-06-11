# VS.NET Formatter

🎯 Format CSS, HTML, JavaScript and ASPX files in VS Code with the same formatting engine used by Visual Studio. 

VS.NET Formatter delegates each formatting request to Visual Studio's
`Edit.FormatDocument` command. This preserves the formatting style expected by
legacy ASP.NET and ASP.NET Web Forms projects across all supported file types.

The extension works immediately after installation. It automatically becomes
the default formatter for CSS, HTML, JavaScript and ASPX files while installed,
with no workspace or user settings required.

Find it in the VS Code Extensions view with `@category:"formatters"`.

## ✨ What It Formats

The extension formats `.css`, `.html`, `.js` and `.aspx` documents opened in VS Code.

It is designed for projects where the expected output is Visual Studio's
**Format Document** result rather than Prettier or VS Code's built-in formatters.

## 🎨 Formatting Behavior

- Uses the actual Visual Studio formatting engine for each file type.
- Produces the same style as Visual Studio's `Ctrl+K, Ctrl+D`.
- Runs Visual Studio hidden while formatting.
- Cleans up temporary formatting files automatically.
- Retries temporary Visual Studio automation failures.
- Leaves unchanged documents untouched.

Run VS Code's **Format Document** command or press `Shift+Alt+F` in any supported file.

## 📋 Requirements

- Windows.
- Visual Studio 2022 installed.
- Windows PowerShell available.

> The first formatting operation may take a few seconds while Visual Studio
> starts in the background.

## ⚙️ Optional Settings

The defaults work without configuration. These settings are available when a
different Visual Studio installation or timeout is required:

| Setting | Default | Description |
| --- | --- | --- |
| `vsnetWebFormatter.visualStudioProgId` | `VisualStudio.DTE.17.0` | ProgID of the Visual Studio version used for formatting. |
| `vsnetWebFormatter.timeout` | `120000` | Maximum formatting time in milliseconds. |

## 🔎 Scope

VS.NET Formatter formats CSS, HTML, JavaScript and ASPX files. It does not
format C#, VB.NET, or project files.

## 📄 License

Distributed under the [MIT License](LICENSE).
