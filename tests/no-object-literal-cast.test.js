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
import rule from '../rules/no-object-literal-cast.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-object-literal-cast', rule, {
	valid: [
		'const config = { retries: 3 } as const;',
		'const change: SubtitleCueChange = { cues: [], language: undefined };',
		'const narrowed = payload as SubtitleCueChange;',
		'const list = [] as number[];',
		// Angle-bracket assertion on a non-literal is not this rule's concern.
		'const narrowed = <SubtitleCueChange>payload;',
	],
	invalid: [
		{
			code: 'const change = { cues: [], language: undefined } as SubtitleCueChange;',
			errors: [{ messageId: 'literalCast' }],
		},
		{
			code: 'emit(\'subtitleCue\', { cues: [] } as SubtitleCueChange);',
			errors: [{ messageId: 'literalCast' }],
		},
		// Angle-bracket assertion is equally banned.
		{
			code: 'const change = <SubtitleCueChange>{ cues: [] };',
			errors: [{ messageId: 'literalCast' }],
		},
	],
});
