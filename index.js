// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

import noCompatVocab from './rules/no-compat-vocab.js';
import noHistoryComments from './rules/no-history-comments.js';
import noObjectLiteralCast from './rules/no-object-literal-cast.js';
import noRawPlayerBus from './rules/no-raw-player-bus.js';
import noRawThrowInPlugin from './rules/no-raw-throw-in-plugin.js';
import noRawTimersInPlugin from './rules/no-raw-timers-in-plugin.js';
import noSingleLetterIdent from './rules/no-single-letter-ident.js';
import noUnknownCast from './rules/no-unknown-cast.js';
import pluginIdRequired from './rules/plugin-id-required.js';

const plugin = {
	meta: {
		name: '@nomercy-entertainment/eslint-plugin-player',
		version: '0.2.0',
	},
	rules: {
		'no-single-letter-ident': noSingleLetterIdent,
		'no-compat-vocab': noCompatVocab,
		'no-history-comments': noHistoryComments,
		'no-object-literal-cast': noObjectLiteralCast,
		'no-unknown-cast': noUnknownCast,
		'no-raw-player-bus': noRawPlayerBus,
		'no-raw-timers-in-plugin': noRawTimersInPlugin,
		'no-raw-throw-in-plugin': noRawThrowInPlugin,
		'plugin-id-required': pluginIdRequired,
	},
};

/**
 * Flat-config preset. Spread `player.configs.recommended` into a config object,
 * or apply the rules by hand. The cast rules are best relaxed inside test files
 * where mock construction legitimately casts — see the README.
 */
plugin.configs = {
	recommended: {
		plugins: { player: plugin },
		rules: {
			'player/no-single-letter-ident': 'error',
			'player/no-compat-vocab': 'error',
			'player/no-history-comments': 'error',
			'player/no-object-literal-cast': 'error',
			'player/no-unknown-cast': 'error',
			'player/no-raw-player-bus': 'error',
			'player/no-raw-timers-in-plugin': 'error',
			'player/no-raw-throw-in-plugin': 'error',
			'player/plugin-id-required': 'error',
		},
	},
};

export default plugin;
