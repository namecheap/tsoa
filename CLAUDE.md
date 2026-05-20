# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Namecheap fork of [tsoa](https://github.com/lukeautry/tsoa) — a framework that generates OpenAPI specs and Express/Koa/Hapi route boilerplate from TypeScript controller classes and decorators. Packages are published under `@namecheap/` scope instead of the upstream `tsoa` scope.

See [agents.md](agents.md) for full architecture documentation and a detailed breakdown of all Namecheap-specific source code changes.

## Commands

All commands use `yarn` and are coordinated via Lerna across the monorepo.

```bash
# Build all packages
yarn build

# Run all tests (builds + prepares fixtures first)
yarn test

# Lint
yarn lint
yarn lint:fix

# Watch mode (all packages in parallel)
yarn watch

# Build a single package
cd packages/cli && yarn build
cd packages/runtime && yarn build
```

Running tests only in the `tests` workspace:
```bash
cd tests
yarn test                  # full: clean → generate routes/specs → typecheck → mocha
yarn prepare-test          # regenerate route/spec fixtures only
yarn typecheck             # tsc only
```

Running a single test file (from `tests/`):
```bash
cross-env NODE_ENV=tsoa_test mocha --require=ts-node/register --require=tsconfig-paths/register --exit tests/integration/express-server.spec.ts
```
