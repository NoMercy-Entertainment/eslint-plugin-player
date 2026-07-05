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
import rule from '../rules/no-history-comments.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-history-comments', rule, {
	valid: [
		'// Resolve before init — re-init corrupts a live instance.\nconst value = 1;',
		'// TODO(#123): strip the auth paths.\nconst value = 1;',
		'// see https://example.test/spec for the wire format\nconst value = 1;',
		'const value = 1;',
	],
	invalid: [
		{
			code: '// Bug 1 fix — single AudioContext invariant.\nconst value = 1;',
			errors: [{ messageId: 'bugHistory' }],
		},
		{
			code: '// Spec §AB: avoid re-initializing core state.\nconst value = 1;',
			errors: [{ messageId: 'specCitation' }],
		},
		{
			code: '// TODO strip the auth XHR paths from the worker.\nconst value = 1;',
			errors: [{ messageId: 'nakedTodo' }],
		},
		{
			code: '// FIXME later\nconst value = 1;',
			errors: [{ messageId: 'nakedTodo' }],
		},
	],
});
