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
import rule from '../rules/no-unknown-cast.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-unknown-cast', rule, {
	valid: [
		'const backend = handle as unknown as IAudioBackend; // mixin: private field',
		'// registry stores the base type; narrow this generic instance\nconst entry = self as unknown as Player;',
		'const narrowed = value as IAudioBackend;',
		'const literal = 1 as const;',
	],
	invalid: [
		{
			code: 'const backend = handle as unknown as IAudioBackend;',
			errors: [{ messageId: 'unknownCast' }],
		},
	],
});
