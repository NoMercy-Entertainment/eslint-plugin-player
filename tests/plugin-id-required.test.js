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
import rule from '../rules/plugin-id-required.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('plugin-id-required', rule, {
	valid: [
		// Declares its own id.
		'class P extends Plugin { static override readonly id = \'my-plugin\'; }',
		'class P extends Plugin<NMVideoPlayer> { static readonly id = \'my-plugin\'; }',
		'class P extends core.Plugin { static id = \'my-plugin\'; }',
		// A static getter declares the id just as well as a field.
		'class P extends Plugin { static get id() { return \'my-plugin\'; } }',
		// Computed string-literal key still declares the id.
		'class P extends Plugin { static [\'id\'] = \'my-plugin\'; }',
		// Abstract intermediate base legitimately defers the id to subclasses.
		'abstract class Base extends Plugin { protected abstract render(): void; }',
		// Not a plugin — no obligation.
		'class Regular { static readonly id = 1; }',
		'class Widget extends HTMLElement {}',
	],
	invalid: [
		{
			code: 'class P extends Plugin { use() {} }',
			errors: [{ messageId: 'missingId' }],
		},
		{
			code: 'class P extends Plugin<NMMusicPlayer> { use() {} }',
			errors: [{ messageId: 'missingId' }],
		},
		{
			code: 'class P extends core.Plugin { use() {} }',
			errors: [{ messageId: 'missingId' }],
		},
	],
});
