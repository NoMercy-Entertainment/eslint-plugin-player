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
import rule from '../rules/no-raw-timers-in-plugin.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-raw-timers-in-plugin', rule, {
	valid: [
		// Sanctioned lifecycle helpers.
		'class P extends Plugin { use() { this.timeout(() => {}, 100); this.interval(() => {}, 1); this.frame(() => {}); this.listen(el, \'click\', h); } }',
		// Raw timers OUTSIDE a plugin are fine (core mixins, consumers).
		'setTimeout(() => {}, 100);',
		'function f(el) { el.addEventListener(\'click\', h); }',
		'class Mixin { tick() { requestAnimationFrame(loop); } }',
		// Nested non-plugin class inside a plugin method is judged by its own extends.
		'class P extends Plugin { use() { class H { go() { setTimeout(f, 1); } } } }',
	],
	invalid: [
		{
			code: 'class P extends Plugin { use() { setTimeout(() => {}, 100); } }',
			errors: [{ messageId: 'rawTimer', data: { raw: 'setTimeout', helper: 'timeout' } }],
		},
		{
			code: 'class P extends Plugin { use() { setInterval(() => {}, 100); } }',
			errors: [{ messageId: 'rawTimer', data: { raw: 'setInterval', helper: 'interval' } }],
		},
		{
			code: 'class P extends Plugin<NMVideoPlayer> { use() { requestAnimationFrame(loop); } }',
			errors: [{ messageId: 'rawTimer', data: { raw: 'requestAnimationFrame', helper: 'frame' } }],
		},
		{
			code: 'class P extends Plugin { use() { this.player.container.addEventListener(\'click\', h); } }',
			errors: [{ messageId: 'rawListener' }],
		},
		{
			code: 'class P extends Plugin { use() { window.setTimeout(f, 1); } }',
			errors: [{ messageId: 'rawTimer', data: { raw: 'setTimeout', helper: 'timeout' } }],
		},
	],
});
