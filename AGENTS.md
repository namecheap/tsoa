# Namecheap TSOA Fork

## Overview

This is a Namecheap fork of [tsoa](https://github.com/lukeautry/tsoa) — a framework that generates OpenAPI specs and Express/Koa/Hapi route boilerplate from TypeScript controller classes and decorators. Packages are published under `@namecheap/` scope instead of the upstream `tsoa` scope.

## Monorepo Structure

```
packages/
  runtime/   @namecheap/tsoa-runtime  — decorators, interfaces, runtime validation helpers
  cli/       @namecheap/tsoa-cli      — metadata extraction, spec + route generation
  tsoa/      @namecheap/tsoa          — re-exports both; the package end-users install
tests/
  fixtures/  — controllers, services, models used by tests
  unit/      — unit tests (spec generation, metadata, templating)
  integration/ — full server integration tests (express, koa, hapi, inversify)
```

`tests` is a Yarn workspace sibling. Its `tsconfig.json` maps `@namecheap/tsoa-cli/*` and `@namecheap/tsoa-runtime/*` to the package source directories so tests run against unbuilt TypeScript.

## Architecture

### Two-Phase Code Generation

**Phase 1 — Metadata extraction** (`packages/cli/src/metadataGeneration/`):
`MetadataGenerator` creates a TypeScript `Program`, walks source files for classes decorated with `@Route`, and delegates to:
- `ControllerGenerator` → per-class metadata
- `MethodGenerator` → per-method metadata (params, responses, security, extensions)
- `ParameterGenerator` → per-parameter metadata
- `TypeResolver` → resolves TypeScript types to `Tsoa.Type` (handles generics, imports, aliases, enums, intersections)

The output is `Tsoa.Metadata` — a plain serializable object describing all controllers and a reference type map.

**Phase 2a — Spec generation** (`packages/cli/src/swagger/`):
`SpecGenerator2` / `SpecGenerator3` consume `Tsoa.Metadata` and emit a Swagger 2.0 or OpenAPI 3.0 JSON/YAML document.

**Phase 2b — Route generation** (`packages/cli/src/routeGeneration/`):
`RouteGenerator` consumes `Tsoa.Metadata` and renders one of three Handlebars templates (`express.hbs`, `koa.hbs`, `hapi.hbs`) to produce a routes file with runtime validation.

Both phases are triggered by `generateSpec` / `generateRoutes` / `generateSpecAndRoutes` in `packages/cli/src/module/`.

### Runtime Package

`packages/runtime/` contains only what ships to end-users at runtime:
- TypeScript decorators (`@Route`, `@Get`, `@Security`, `@Body`, etc.)
- Validation logic used in generated routes
- Type definitions (`Tsoa.*`, `Swagger.*`, `Config`)

It has no dependency on the CLI or TypeScript compiler API.

---

## Namecheap-Specific Source Code Changes

### 1. Pluggable Security Hook

**Files:** `packages/cli/src/metadataGeneration/metadataGenerator.ts`, `controllerGenerator.ts`, `methodGenerator.ts`, `securityGenerator.ts`

Added `MetadataGeneratorOptions` with an optional `securityGenerator` callback:

```ts
type SecurityGenerator = (node: ClassDeclaration | MethodDeclaration, typeChecker: TypeChecker, inheritedSecurities?: Tsoa.Security[]) => Tsoa.Security[]
```

When provided, both `ControllerGenerator.getSecurity()` and `MethodGenerator.getSecurity()` short-circuit to call it instead of reading `@Security` / `@NoSecurity` decorators. Lets callers implement custom security extraction logic entirely from outside tsoa.

---

### 2. `import X as Y` Alias Fix in TypeResolver

**File:** `packages/cli/src/metadataGeneration/typeResolver.ts`

Two fixes:

**a)** `getModelTypeDeclaration`: when the resolved symbol's `escapedName` differs from the local name (i.e. the type was imported with an alias like `import { TestModel as ResponseModel }`), uses `symbol.escapedName` as the canonical type name to look up declarations correctly.

**b)** Heritage clause property merging: `referenceType.properties.forEach` → `(referenceType.properties || []).forEach` — null safety for the case where `properties` is undefined. Wrapped in a try/catch.

> **Note:** A `console.log('HERITAGE =', heritageClauses)` debug line was left in at line ~256 and is still present.

---

### 3. Custom Decorator Extension System (NodeDecoratorProcessor)

**Files:** `packages/cli/src/metadataGeneration/methodGenerator.ts`, `packages/cli/src/metadataGeneration/types/nodeDecoratorProcessor.ts`

Added `customDecoratorProcessors: Record<string, NodeDecoratorProcessor>` to `MetadataGeneratorOptions`. After building method metadata, `MethodGenerator` loops over registered processors, finds matching decorators on the AST node, and calls:

```ts
interface DecoratorProcessorContext { methodObject: Tsoa.Method; decoratorArguments: any[] }
type NodeDecoratorProcessor = (context: DecoratorProcessorContext) => void
```

The processor mutates `methodObject` in-place (e.g. pushing to `extensions` for OpenAPI `x-*` fields). Errors include the AST node in `GenerateMetadataError` for better diagnostics. Decorator arguments are resolved via `getInitializerValue` in `initializer-value.ts`.

---

### 4. Decorator Argument Resolution in `initializer-value.ts`

**File:** `packages/cli/src/metadataGeneration/initializer-value.ts`

Extended `getInitializerValue` to handle more expression forms when reading decorator arguments at compile time:

- **Named import aliases** (`import { cfg } from './x'; @Dec(cfg)`) — follows the import alias chain via `getAliasedSymbol`
- **`as const` / type assertions** — handles `AsExpression` (`x as const`), unwrapping it to evaluate the inner expression
- **Arithmetic expressions** — handles `BinaryExpression` for `*` and `/` operators (e.g. `15 * 60` evaluates to `900`)
- **`ImportSpecifier`** — refactored into a shared `getImportSpecifierValue` helper to avoid duplication
