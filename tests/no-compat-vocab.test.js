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
import rule from '../rules/no-compat-vocab.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-compat-vocab', rule, {
	valid: [
		'class NMVideoPlayer {}',
		'class NMMusicPlayer {}',
		'const itemEndingSoon = true;',
		'type PlayState = \'playing\' | \'paused\';',
		'// Resolve before init — re-init corrupts a live instance.',
		'const nmplayer = () => {};',
	],
	invalid: [
		{
			code: 'const nmVideoPlayer = () => {};',
			errors: [{ messageId: 'bannedIdentifier' }],
		},
		{
			code: 'const nmMPlayer = () => {};',
			errors: [{ messageId: 'bannedIdentifier' }],
		},
		{
			code: 'class PlayerCore {}',
			errors: [{ messageId: 'bannedIdentifier' }],
		},
		{
			code: 'type PlayStateToken = string;',
			errors: [{ messageId: 'bannedIdentifier' }],
		},
		{
			code: 'const trackEndingSoon = 1;',
			errors: [{ messageId: 'bannedIdentifier' }],
		},
		{
			code: '// @deprecated use nmplayer instead\nconst value = 1;',
			errors: [{ messageId: 'bannedComment' }],
		},
		{
			code: '// Backwards-compatible alias for releaseLock().\nfunction releaseLeadership() {}',
			errors: [{ messageId: 'bannedComment' }],
		},
	],
});
