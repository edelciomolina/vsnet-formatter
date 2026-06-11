# Contributing

## Development

```powershell
npm install
npm run check
npm test
npm run test:coverage
npm run package
```

## Unit Tests

The project uses [Vitest](https://vitest.dev/) for unit tests. Tests isolate
the VS Code and Visual Studio integrations, so they do not open Visual Studio
or publish an extension.

```powershell
npm test
npm run test:watch
npm run test:coverage
```

Coverage thresholds are enforced per file at 90% for statements, branches,
functions, and lines. `npm run check`, CI, packaging, and deployment enforce
these thresholds.
