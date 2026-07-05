// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Detect exported symbols whose body is byte-identical (whitespace-normalised)
 * across the video and music packages. Identical constants/types/enums defined
 * in both libraries are shared code that belongs in core, imported once — not
 * copy-pasted. This is the regression guard for the BACKEND_STATE class of bug.
 *
 * Usage: node check-duplicate-symbols.mjs [videoSrc] [musicSrc]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@typescript-eslint/typescript-estree';

const here = dirname(fileURLToPath(import.meta.url));
const videoSrc = resolve(process.argv[2] ?? join(here, '../../nomercy-video-player/src'));
const musicSrc = resolve(process.argv[3] ?? join(here, '../../nomercy-music-player/src'));

function walk(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === '__tests__' || entry === 'node_modules')
				continue;
			files.push(...walk(full));
		}
		else if (extname(full) === '.ts' && !full.endsWith('.test.ts')) {
			files.push(full);
		}
	}
	return files;
}

const normalise = text => text.replace(/\s+/gu, '');

/** Map exported const/type/enum name -> normalised body text for one package. */
function collectSymbols(srcDir) {
	const symbols = new Map();
	for (const file of walk(srcDir)) {
		const code = readFileSync(file, 'utf8');
		let ast;
		try {
			ast = parse(code, { range: true, jsx: false });
		}
		catch {
			continue;
		}

		for (const node of ast.body) {
			if (node.type !== 'ExportNamedDeclaration' || !node.declaration)
				continue;
			const declaration = node.declaration;

			// Only self-contained structural definitions are meaningfully comparable
			// by text. Identifier / call / member aliases (`const x = SomeClass`)
			// name a per-package symbol even when the text matches, so they are
			// skipped to avoid false positives.
			const STRUCTURAL_INIT = new Set(['ObjectExpression', 'ArrayExpression']);
			const STRUCTURAL_TYPE = new Set(['TSTypeLiteral', 'TSUnionType', 'TSIntersectionType']);

			if (declaration.type === 'VariableDeclaration') {
				for (const declarator of declaration.declarations) {
					if (declarator.id.type === 'Identifier' && declarator.init && STRUCTURAL_INIT.has(declarator.init.type)) {
						symbols.set(declarator.id.name, {
							body: normalise(code.slice(declarator.init.range[0], declarator.init.range[1])),
							file,
						});
					}
				}
			}
			else if (declaration.type === 'TSTypeAliasDeclaration' && STRUCTURAL_TYPE.has(declaration.typeAnnotation.type)) {
				symbols.set(declaration.id.name, {
					body: normalise(code.slice(declaration.typeAnnotation.range[0], declaration.typeAnnotation.range[1])),
					file,
				});
			}
			else if (declaration.type === 'TSEnumDeclaration') {
				symbols.set(declaration.id.name, {
					body: normalise(code.slice(declaration.range[0], declaration.range[1])),
					file,
				});
			}
		}
	}
	return symbols;
}

const videoSymbols = collectSymbols(videoSrc);
const musicSymbols = collectSymbols(musicSrc);

const duplicates = [];
for (const [name, video] of videoSymbols) {
	const music = musicSymbols.get(name);
	// Ignore trivial bodies (single literal / identifier) — not worth hoisting.
	if (music && music.body === video.body && video.body.length > 12)
		duplicates.push({ name, video: video.file, music: music.file });
}

if (duplicates.length > 0) {
	console.error('check-duplicate-symbols: FAIL — identical exports in both video and music (hoist to core):');
	for (const duplicate of duplicates) {
		console.error(`  ${duplicate.name}`);
		console.error(`    video: ${duplicate.video}`);
		console.error(`    music: ${duplicate.music}`);
	}
	process.exit(1);
}

console.log(`check-duplicate-symbols: OK (${videoSymbols.size} video / ${musicSymbols.size} music exports, no cross-package duplication)`);
