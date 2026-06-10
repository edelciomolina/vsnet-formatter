# VS.NET Web Formatter

Formatter CSS local do VS Code para projetos ASP.NET Web Forms legados.

Ele delega a formatação CSS ao comando `Edit.FormatDocument` do Visual Studio
2022, mantendo a indentação hierárquica do `Ctrl+K, Ctrl+D` do Visual Studio.

HTML/ASPX e JavaScript usam os formatadores nativos do VS Code, configurados
no arquivo `.vscode/settings.json` do projeto.

## Requisitos

- Visual Studio 2022 instalado
- Windows PowerShell disponível

## Instalação

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-vsix.ps1
code --install-extension .\vsnet-web-formatter-0.0.1.vsix --force
```

Após instalar ou atualizar, recarregue a janela do VS Code.
