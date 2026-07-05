// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Inside a plugin, ban `this.player.on / once / off / emit`. The plugin base
 * ships scoped equivalents (`this.on`, `this.once`, `this.off`, `this.emit`)
 * that namespace the event and auto-dispose on teardown. Reaching the player's
 * raw bus skips both: the listener never unsubscribes when the plugin disposes,
 * and an emit lands on the player's global channel instead of `plugin:<id>:`.
 *
 * This is the mechanical half of the this-versus-this.player boundary — the
 * `Plugin` base doc already promises "the lint pack enforces all of these".
 * The design half (whether a behaviour should be a player concern at all) stays
 * a human judgement.
 *
 * `this.player.emit('plugin:...')` and other player methods (`play`, `seek`,
 * `getPlugin`, ...) are the legitimate action surface and are NOT flagged — only
 * the four bus methods are.
 */

import { inPluginSubclass } from './_in-plugin-subclass.js';

const BUS_METHODS = new Set(['on', 'once', 'off', 'emit']);

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Ban this.player.on/once/off/emit inside a plugin — use the scoped, auto-disposing this.on/once/off/emit.',
		},
		schema: [],
		messages: {
			rawBus: "this.player.{{method}}(...) inside a plugin bypasses scoping and auto-dispose — use this.{{method}}(...) instead.",
		},
	},

	create(context) {
		return {
			CallExpression(node) {
				const callee = node.callee;
				if (callee.type !== 'MemberExpression' || callee.computed)
					return;
				if (callee.property.type !== 'Identifier' || !BUS_METHODS.has(callee.property.name))
					return;

				// object must be `this.player`
				const object = callee.object;
				if (
					object.type !== 'MemberExpression'
					|| object.computed
					|| object.object.type !== 'ThisExpression'
					|| object.property.type !== 'Identifier'
					|| object.property.name !== 'player'
				)
					return;

				if (!inPluginSubclass(node))
					return;

				context.report({
					node: callee,
					messageId: 'rawBus',
					data: { method: callee.property.name },
				});
			},
		};
	},
};
