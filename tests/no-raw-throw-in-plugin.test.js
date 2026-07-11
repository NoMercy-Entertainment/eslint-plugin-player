// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';
import rule from '../rules/no-raw-throw-in-plugin.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-raw-throw-in-plugin', rule, {
	valid: [
		// Structured surface.
		'class P extends Plugin { use() { this.throw({ code: \'x\', message: \'m\' }); } }',
		// Re-throwing a caught / handed value is legitimate.
		'class P extends Plugin { use() { try {} catch (err) { throw err; } } }',
		'class P extends Plugin { use() { throw this.buildError(); } }',
		// Raw throw OUTSIDE a plugin (core, utilities) is fine — those own their error strategy.
		'function f() { throw new Error(\'boom\'); }',
		'class Mixin { go() { throw new TypeError(\'x\'); } }',
	],
	invalid: [
		{
			code: 'class P extends Plugin { use() { throw new Error(\'boom\'); } }',
			errors: [{ messageId: 'rawThrow', data: { ctor: 'Error' } }],
		},
		{
			code: 'class P extends Plugin<NMVideoPlayer> { use() { throw new TypeError(\'bad\'); } }',
			errors: [{ messageId: 'rawThrow', data: { ctor: 'TypeError' } }],
		},
		{
			code: 'class P extends core.Plugin { use() { throw new RangeError(\'r\'); } }',
			errors: [{ messageId: 'rawThrow', data: { ctor: 'RangeError' } }],
		},
		// Namespaced constructor is still a raw throw.
		{
			code: 'class P extends Plugin { use() { throw new window.Error(\'x\'); } }',
			errors: [{ messageId: 'rawThrow', data: { ctor: 'Error' } }],
		},
	],
});
