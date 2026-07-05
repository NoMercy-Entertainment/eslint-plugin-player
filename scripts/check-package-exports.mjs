// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Assert a package's `exports` map is honest:
 *   - every string target resolves to a file that exists on disk, and
 *   - no subpath key reaches into `./src/` (consumers must import built dist,
 *     never source).
 *
 * Usage: node check-package-exports.mjs [packageDir ...]
 * Defaults to the three trio packages relative to this script.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PACKAGES = [
	resolve(here, '../../nomercy-player-core'),
	resolve(here, '../../nomercy-video-player'),
	resolve(here, '../../nomercy-music-player'),
];

function collectStringTargets(node, out) {
	if (typeof node === 'string') {
		out.push(node);
	}
	else if (node && typeof node === 'object') {
		for (const value of Object.values(node))
			collectStringTargets(value, out);
	}
}

function checkPackage(packageDir) {
	const manifestPath = join(packageDir, 'package.json');
	if (!existsSync(manifestPath))
		return [];

	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
	const problems = [];
	const exportsMap = manifest.exports ?? {};

	for (const key of Object.keys(exportsMap)) {
		if (key.startsWith('./src/') || key === './src')
			problems.push(`${manifest.name}: export subpath "${key}" points into src/ — expose built dist only.`);
	}

	const targets = [];
	collectStringTargets(exportsMap, targets);
	if (typeof manifest.main === 'string')
		targets.push(manifest.main);

	for (const target of targets) {
		if (!target.startsWith('./'))
			continue;
		if (!existsSync(join(packageDir, target)))
			problems.push(`${manifest.name}: export target "${target}" does not exist on disk.`);
	}

	return problems;
}

const packageDirs = process.argv.slice(2).length > 0
	? process.argv.slice(2).map(dir => resolve(dir))
	: DEFAULT_PACKAGES;

const allProblems = packageDirs.flatMap(checkPackage);

if (allProblems.length > 0) {
	console.error('check-package-exports: FAIL');
	for (const problem of allProblems)
		console.error(`  ${problem}`);
	process.exit(1);
}

console.log(`check-package-exports: OK (${packageDirs.length} package(s), all export targets resolve, no src/ subpaths)`);
