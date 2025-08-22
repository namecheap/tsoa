import * as ts from 'typescript';
import { Tsoa } from '@namecheap/tsoa-runtime';

const hasInitializer = (node: ts.Node): node is ts.HasInitializer => Object.prototype.hasOwnProperty.call(node, 'initializer');
const extractInitializer = (decl?: ts.Declaration) => (decl && hasInitializer(decl) && (decl.initializer as ts.Expression)) || undefined;
const extractImportSpecifier = (symbol?: ts.Symbol) => (symbol?.declarations && symbol.declarations.length > 0 && ts.isImportSpecifier(symbol.declarations[0]) && symbol.declarations[0]) || undefined;
const getImportSpecifierValue = (importSpecifier: ts.ImportSpecifier, typeChecker: ts.TypeChecker) => {
  const importSymbol = typeChecker.getSymbolAtLocation(importSpecifier.name);
  if (!importSymbol) {
    return;
  }
  const aliasedSymbol = typeChecker.getAliasedSymbol(importSymbol);
  const declarations = aliasedSymbol.getDeclarations();
  const declaration = declarations && declarations.length > 0 ? declarations[0] : undefined;
  return getInitializerValue(extractInitializer(declaration), typeChecker);
};

export const getInitializerValue = (initializer?: ts.Expression | ts.ImportSpecifier, typeChecker?: ts.TypeChecker, type?: Tsoa.Type) => {
  if (!initializer || !typeChecker) {
    return;
  }

  switch (initializer.kind) {
    case ts.SyntaxKind.AsExpression:
      return getInitializerValue((initializer as ts.AsExpression).expression, typeChecker, type);
    case ts.SyntaxKind.BinaryExpression: {
      const be = initializer as ts.BinaryExpression;
      const leftVal = getInitializerValue(be.left as any, typeChecker, type);
      const rightVal = getInitializerValue(be.right as any, typeChecker, type);
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        switch (be.operatorToken.kind) {
          case ts.SyntaxKind.AsteriskToken:
            return leftVal * rightVal;
          case ts.SyntaxKind.SlashToken:
            return rightVal !== 0 ? leftVal / rightVal : undefined;
          default:
            return undefined;
        }
      }
      return undefined;
    }
    case ts.SyntaxKind.ArrayLiteralExpression: {
      const arrayLiteral = initializer as ts.ArrayLiteralExpression;
      return arrayLiteral.elements.map(element => getInitializerValue(element, typeChecker));
    }
    case ts.SyntaxKind.StringLiteral:
      return (initializer as ts.StringLiteral).text;
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.FirstLiteralToken:
      return Number((initializer as ts.NumericLiteral).text);
    case ts.SyntaxKind.NewExpression: {
      const newExpression = initializer as ts.NewExpression;
      const ident = newExpression.expression as ts.Identifier;

      if (ident.text === 'Date') {
        let date = new Date();
        if (newExpression.arguments) {
          const newArguments = newExpression.arguments.filter(args => args.kind !== undefined);
          const argsValue = newArguments.map(args => getInitializerValue(args, typeChecker));
          if (argsValue.length > 0) {
            date = new Date(argsValue as any);
          }
        }
        const dateString = date.toISOString();
        if (type && type.dataType === 'date') {
          return dateString.split('T')[0];
        }
        return dateString;
      }
      return;
    }
    case ts.SyntaxKind.NullKeyword:
      return null;
    case ts.SyntaxKind.ObjectLiteralExpression: {
      const objectLiteral = initializer as ts.ObjectLiteralExpression;
      const nestedObject: any = {};
      objectLiteral.properties.forEach((p: any) => {
        nestedObject[p.name.text] = getInitializerValue(p.initializer, typeChecker);
      });
      return nestedObject;
    }
    case ts.SyntaxKind.ImportSpecifier: {
      return getImportSpecifierValue(initializer as ts.ImportSpecifier, typeChecker);
    }
    default: {
      // Attempt to resolve the value for any non-special expression by looking up its symbol.
      const symbol = typeChecker.getSymbolAtLocation(initializer);
      const directInit = extractInitializer(symbol?.valueDeclaration);
      if (directInit) {
        return getInitializerValue(directInit, typeChecker);
      }

      // If it's a named import (e.g., import { cfg } from './x'; @Dec(cfg)),
      // follow the alias to the exported declaration and evaluate its initializer.
      const importSpecifier = extractImportSpecifier(symbol);
      if (importSpecifier) {
        return getImportSpecifierValue(importSpecifier, typeChecker);
      }

      return;
    }
  }
};
