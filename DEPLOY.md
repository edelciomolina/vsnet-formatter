# Deploy

## Primeira vez

1. Crie um PAT no Azure DevOps:
   - Acesse `https://dev.azure.com/edelciomolina-personal-org/_usersSettings/tokens`
   - **Organization**: All accessible organizations
   - **Scopes**: Marketplace → Manage

2. Autentique o `vsce`:
   ```powershell
   npx vsce login edelciomolina
   ```

## Publicar

```powershell
npm run publish
```

Incrementa o **minor** automaticamente, publica no Marketplace e faz push para o GitHub.

Para outros incrementos:

```powershell
npm run publish -- patch
npm run publish -- major
npm run publish -- 1.2.3
```
