// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Type-inference codemod for single-letter parameters and variables. Where the
 * eslint rule can only autofix a name it can prove syntactically, this reads the
 * INFERRED type of each binding and names it from that: `levels.find(q => ...)`
 * sees `q: QualityLevel` and renames to `qualityLevel`, not a blind `queue`.
 * Bindings whose type yields no clean name (primitives, unions, anonymous
 * shapes) are left untouched for a human. Renames go through ts-morph's
 * language-service rename, so every in-scope reference moves atomically.
 *
 * Usage:
 *   node rename-single-letters.mjs <packageDir>            # dry run (default)
 *   node rename-single-letters.mjs <packageDir> --apply    # write changes
 */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Node, Project, SyntaxKind } from 'ts-morph';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(process.argv[2] ?? join(here, '../../nomercy-music-player'));
const apply = process.argv.includes('--apply');

const ALLOW = new Set(['x', 'y', 'z', 'i', 'j', 'k']);
const RESERVED = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'var', 'void', 'while', 'with', 'yield']);

const GENERIC_TYPES = new Set(['Map', 'ReadonlyMap', 'WeakMap', 'Set', 'WeakSet', 'Promise', 'Array', 'ReadonlyArray', 'Object', 'Function', 'Record', 'Partial', 'Element', 'Node', 'EventTarget']);

function deriveFromTypeName(typeName) {
	if (!typeName || typeName === '__type' || typeName === '__object' || typeName === '__function')
		return null;
	if (GENERIC_TYPES.has(typeName) || /global/iu.test(typeName) || /^webkit/u.test(typeName))
		return null;
	let base = typeName;
	if (/^I[A-Z]/u.test(base))
		base = base.slice(1);
	else if (/^NM[A-Z]/u.test(base))
		base = base.slice(2);
	const camel = base.charAt(0).toLowerCase() + base.slice(1);
	if (!/^[a-z][A-Za-z0-9]*$/u.test(camel) || camel.length < 2 || RESERVED.has(camel))
		return null;
	// Reject acronym-led types (HTMLDivElement -> hTMLDivElement is garbage).
	if (/^[a-z][A-Z]{2,}/u.test(camel))
		return null;
	return camel;
}

/** Name derived from the binding's resolved type, or null when it is unclear. */
function proposeName(node) {
	// A caught binding is always an error, regardless of its (unknown) type.
	if (node.getKind() === SyntaxKind.VariableDeclaration && node.getParent()?.getKind() === SyntaxKind.CatchClause)
		return 'error';

	const type = node.getType();
	if (type.isNumber() || type.isString() || type.isBoolean() || type.isAny() || type.isUnknown() || type.isNull() || type.isUndefined() || type.isUnion() || type.isIntersection())
		return null;
	const symbol = type.getSymbol() ?? type.getAliasSymbol();
	return symbol ? deriveFromTypeName(symbol.getName()) : null;
}

/**
 * Scope key that siblings share so same-name renames can be detected. A
 * parameter's scope is its param-list owner; a variable's scope is the nearest
 * block or the source file.
 */
function scopeKeyFor(candidate) {
	if (candidate.getKind() === SyntaxKind.Parameter)
		return candidate.getParent()?.getStart() ?? 'param';
	const scope = candidate.getFirstAncestor(ancestor => ancestor.getKind() === SyntaxKind.Block || ancestor.getKind() === SyntaxKind.SourceFile);
	return scope?.getStart() ?? 'module';
}

/** Names declared in the nearest function scope + the file's module-level bindings. */
function scopeNames(nameNode) {
	const names = new Set();
	const sourceFile = nameNode.getSourceFile();
	for (const declaration of sourceFile.getImportDeclarations()) {
		for (const named of declaration.getNamedImports())
			names.add(named.getName());
		const defaultImport = declaration.getDefaultImport();
		if (defaultImport)
			names.add(defaultImport.getText());
	}
	sourceFile.getFunctions().forEach(fn => fn.getName() && names.add(fn.getName()));
	sourceFile.getVariableDeclarations().forEach(declaration => names.add(declaration.getName()));

	const fn = nameNode.getFirstAncestor(ancestor => Node.isFunctionDeclaration(ancestor) || Node.isFunctionExpression(ancestor) || Node.isArrowFunction(ancestor) || Node.isMethodDeclaration(ancestor) || Node.isConstructorDeclaration(ancestor));
	if (fn) {
		fn.getParameters().forEach(param => names.add(param.getName()));
		fn.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(declaration => names.add(declaration.getName()));
	}
	return names;
}

const project = new Project({
	tsConfigFilePath: join(packageDir, 'tsconfig.json'),
	skipAddingFilesFromTsConfig: false,
});

const proposals = [];
const skipped = { noName: 0, collision: 0 };

for (const sourceFile of project.getSourceFiles()) {
	const path = sourceFile.getFilePath();
	if (path.includes('/node_modules/') || !path.includes('/src/'))
		continue;

	const candidates = [
		...sourceFile.getDescendantsOfKind(SyntaxKind.Parameter),
		...sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration),
		...sourceFile.getDescendantsOfKind(SyntaxKind.BindingElement),
	];

	for (const candidate of candidates) {
		const nameNode = candidate.getNameNode?.();
		if (!nameNode || nameNode.getKind() !== SyntaxKind.Identifier)
			continue;
		const current = nameNode.getText();
		if (current.length !== 1 || ALLOW.has(current))
			continue;

		const proposed = proposeName(candidate);
		if (!proposed) {
			skipped.noName++;
			continue;
		}
		if (scopeNames(nameNode).has(proposed)) {
			skipped.collision++;
			continue;
		}
		proposals.push({
			nameNode,
			current,
			proposed,
			scopeKey: `${path}::${scopeKeyFor(candidate)}`,
			where: `${path.split(/[\\/]/u).slice(-2).join('/')}:${nameNode.getStartLineNumber()}`,
		});
	}
}

// Drop bindings in the same scope that resolve to the SAME name (e.g. a sort
// comparator `(a, b)` where both are the same type). Renaming both would create
// a duplicate identifier — leave them for a human to name (itemA / itemB).
const claimCounts = new Map();
for (const entry of proposals) {
	const claim = `${entry.scopeKey}::${entry.proposed}`;
	claimCounts.set(claim, (claimCounts.get(claim) ?? 0) + 1);
}
const collisionInScope = proposals.filter(entry => claimCounts.get(`${entry.scopeKey}::${entry.proposed}`) > 1).length;
const applicable = proposals.filter(entry => claimCounts.get(`${entry.scopeKey}::${entry.proposed}`) === 1);
skipped.collision += collisionInScope;

console.log(`rename-single-letters (${apply ? 'APPLY' : 'dry-run'}) — ${packageDir.split(/[\\/]/u).pop()}`);
console.log(`  proposed renames: ${applicable.length}`);
console.log(`  skipped (no confident name): ${skipped.noName}`);
console.log(`  skipped (name collision):    ${skipped.collision}`);

const byMapping = new Map();
for (const entry of applicable) {
	const key = `${entry.current} -> ${entry.proposed}`;
	byMapping.set(key, (byMapping.get(key) ?? 0) + 1);
}
const mappings = [...byMapping.entries()].sort((first, second) => second[1] - first[1]);
console.log(`  distinct mappings (${mappings.length}):`);
for (const [mapping, count] of mappings)
	console.log(`    ${String(count).padStart(4)}x  ${mapping}`);

if (apply) {
	for (const entry of applicable)
		entry.nameNode.rename(entry.proposed);
	await project.save();
	console.log(`  applied ${applicable.length} renames and saved.`);
}
