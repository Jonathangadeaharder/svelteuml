# SvelteUML

[![CI](https://github.com/user/svelteuml/actions/workflows/ci.yml/badge.svg)](https://github.com/user/svelteuml/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-v8-brightgreen)](https://github.com/user/svelteuml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green)](https://nodejs.org/)

Architecture and Dependency Visualization for SvelteKit: TypeScript-Native PlantUML Generator.

Generates PlantUML class and package diagrams from SvelteKit codebases using static analysis (svelte2tsx + ts-morph pipeline).

## Features

- Static analysis of SvelteKit projects — no runtime required
- PlantUML class and package diagram generation
- Path alias resolution (`$lib`, custom aliases from `svelte.config.js` and `tsconfig.json`)
- Configurable inclusion/exclusion glob patterns
- Dependency depth control

## Quick Start

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run lint
```

## Usage

```bash
svelteuml --targetDir ./my-sveltekit-app --output diagram.puml
```

## Development

| Command | Description |
|---|---|
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm dev` | Watch mode compilation |
| `pnpm test` | Run test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm run typecheck` | Type-check without emitting |
| `pnpm run lint` | Lint with Biome |
| `pnpm run format` | Format with Biome |

## License

MIT
