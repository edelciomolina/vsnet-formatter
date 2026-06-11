# Publishing

## Authentication

Before the first deployment:

1. Create or confirm the `edelciomolina` publisher in the
   [Visual Studio Marketplace management portal](https://marketplace.visualstudio.com/manage).
2. Create an Azure DevOps Personal Access Token with the
   **Marketplace > Manage** permission.
3. Authenticate `vsce`:

```powershell
npx vsce login edelciomolina
```

The token can also be provided through the `VSCE_PAT` environment variable:

```powershell
$env:VSCE_PAT = "your-token"
```

The `publisher` value in `package.json` must exactly match the Marketplace
publisher ID.

## Deployment

Run deployments with a clean Git working tree:

```powershell
npm run publish
npm run publish -- patch
npm run publish -- major
npm run publish -- 1.2.3
```

The publish command validates the project, updates the version, creates the
version commit and tag, publishes to the Visual Studio Marketplace, and pushes
to GitHub.
