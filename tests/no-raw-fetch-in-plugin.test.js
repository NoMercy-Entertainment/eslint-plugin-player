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
import rule from '../rules/no-raw-fetch-in-plugin.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-raw-fetch-in-plugin', rule, {
	valid: [
		// The sanctioned auth-aware helper.
		'class P extends Plugin { use() { this.fetch(\'/api/x\'); } }',
		'class P extends Plugin<NMVideoPlayer> { async use() { await this.fetch(\'/i18n/en.json\', { responseType: \'json\' }); } }',
		// Raw fetch OUTSIDE a plugin (services, composables, core internals) is fine.
		'async function load() { return fetch(\'/api/x\'); }',
		'class Service { get() { return window.fetch(\'/api/x\'); } }',
		// A property named fetch on some other object is not the global.
		'class P extends Plugin { use() { this.socket.fetch(\'/x\'); } }',
		// Nested non-plugin class inside a plugin method is judged by its own extends.
		'class P extends Plugin { use() { class H { go() { fetch(\'/x\'); } } } }',
	],
	invalid: [
		{
			code: 'class P extends Plugin { use() { fetch(\'/api/x\'); } }',
			errors: [{ messageId: 'rawFetch', data: { form: 'fetch(...)' } }],
		},
		{
			code: 'class P extends Plugin<NMVideoPlayer> { async use() { await fetch(\'/media.m3u8\'); } }',
			errors: [{ messageId: 'rawFetch', data: { form: 'fetch(...)' } }],
		},
		{
			code: 'class P extends Plugin { use() { window.fetch(\'/api/x\'); } }',
			errors: [{ messageId: 'rawFetch', data: { form: 'window.fetch(...)' } }],
		},
		{
			code: 'class P extends core.Plugin { use() { globalThis.fetch(\'/api/x\'); } }',
			errors: [{ messageId: 'rawFetch', data: { form: 'globalThis.fetch(...)' } }],
		},
	],
});
