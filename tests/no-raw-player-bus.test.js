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
import rule from '../rules/no-raw-player-bus.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

ruleTester.run('no-raw-player-bus', rule, {
	valid: [
		// Scoped helpers — the sanctioned surface.
		'class P extends Plugin { use() { this.on(\'play\', () => {}); this.emit(\'x\', {}); } }',
		// Player action methods are not the bus — always allowed.
		'class P extends Plugin { use() { this.player.play(); this.player.seekByPercentage(50); this.player.getPlugin(Other); } }',
		// Generic-form extends still allows action methods.
		'class P extends Plugin<NMVideoPlayer> { use() { this.player.play(); } }',
		// Same call OUTSIDE a plugin — a core mixin composing onto the player legitimately uses this.player-shaped code is not a plugin; a bare consumer holding a player also may.
		'const player = make(); player.on(\'play\', () => {});',
		'function f(player) { player.emit(\'x\', {}); }',
		// A nested non-plugin class inside a plugin method is judged by its own extends.
		'class P extends Plugin { use() { class Helper { go(p) { p.on(\'x\', () => {}); } } } }',
	],
	invalid: [
		{
			code: 'class P extends Plugin { use() { this.player.on(\'play\', () => {}); } }',
			errors: [{ messageId: 'rawBus', data: { method: 'on' } }],
		},
		{
			code: 'class P extends Plugin { use() { this.player.emit(\'x\', {}); } }',
			errors: [{ messageId: 'rawBus' }],
		},
		{
			code: 'class P extends Plugin<NMMusicPlayer, Opts> { use() { this.player.once(\'ready\', () => {}); this.player.off(\'ready\', h); } }',
			errors: [{ messageId: 'rawBus' }, { messageId: 'rawBus' }],
		},
		{
			code: 'class P extends core.Plugin { use() { this.player.on(\'play\', () => {}); } }',
			errors: [{ messageId: 'rawBus' }],
		},
	],
});
