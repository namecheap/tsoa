---
name: project_ts6_upgrade
description: "TypeScript v6 upgrade — breaking changes fixed in tsoa's type resolver and swagger generators"
metadata: 
  node_type: memory
  type: project
  originSessionId: 55aaffb4-ee2d-4c95-9ce0-76947e423b97
---

TypeScript v6 was upgraded in this repo. All unit tests (1111) now pass after fixes.

**Why:** TS v6 changed type checker behavior in two ways relevant to tsoa.

**Key fixes applied:**

1. **`typeResolver.ts` `calcMappedType` (line ~210)**: TS v6 `getTypeOfSymbol()` for optional properties in mapped types now includes `undefined` (e.g., `"id" | undefined` instead of `"id"`). Fix: strip the single `undefined` constituent when the property is optional (`SymbolFlags.Optional`) and only one non-undefined type remains.

2. **`typeResolver.ts` union TypeNode ordering (line ~65)**: TS v6 UnionType `.types` order may differ from the UnionTypeNode `.types` order. Fix: semantic matching for synthetic TypeNodes (pos === -1) instead of index-based — UndefinedKeyword matches undefined type, non-keyword matches non-null/undefined type.

3. **`typeResolver.ts` MappedTypeNode guard (line ~441)**: Skip `symbol.valueDeclaration` when it's a MappedTypeNode, since `.type` on such nodes is the unresolved template.

4. **`typeResolver.ts` synthetic node referencer fallback (line ~796)**: For synthetic TypeNodes (pos === -1), fall back to `this.referencer` instead of calling `typeChecker.getTypeFromTypeNode()` which fails.

5. **`typeResolver.ts` keyword-indexed accessor (line ~445)**: Pass `type` as 5th arg (referencer) to TypeResolver.

6. **`specGenerator2.ts` union type**: Added `typesWithoutUndefined.length === 1` shortcut in `getSwaggerTypeForUnionType` to handle optional enum properties becoming `T | undefined` in TS v6.

7. **Test expectations**: Updated `boolValue*` test expectations from `type: 'string'` to `type: 'boolean'` — TS v6 changed conditional type evaluation: `boolean | undefined extends boolean` = `false` (not `true`).

**How to apply:** If TS is upgraded again, check these same locations for API behavior changes.
