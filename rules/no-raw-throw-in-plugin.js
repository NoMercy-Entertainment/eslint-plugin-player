// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Inside a plugin, ban `throw new Error(...)` (and other raw error subclasses).
 * A raw throw escapes the player's structured error surface: no severity, no
 * `plugin:<id>` scope, no recovery-action routing, no error/warning event for
 * the consumer. The plugin base ships `this.throw({...})` (aborts) and
 * `this.report({...})` (warning, keeps playing), both of which build a
 * `PlayerError` and route it through the standard channel.
 *
 * `throw error` where `error` is already a caught/constructed value is left
 * alone — the ban targets the raw-construction form `throw new <Error>(...)`,
 * which is where a plugin author reaches past the helper. Re-throwing a value
 * the kit handed you is legitimate.
 */

import { inPluginSubclass } from './_in-plugin-subclass.js';

// Raw JS error constructors. A plugin should never hand-build one of these to
// throw; the kit's PlayerError hierarchy (via this.throw) is the surface.
const RAW_ERROR_CTORS = new Set([
	'Error',
	'TypeError',
	'RangeError',
	'SyntaxError',
	'ReferenceError',
	'EvalError',
	'URIError',
	'AggregateError',
]);

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Ban throw new Error(...) inside a plugin — use this.throw({...}) (abort) or this.report({...}) (warning).',
		},
		schema: [],
		messages: {
			rawThrow: "throw new {{ctor}}(...) inside a plugin skips the structured error surface — use this.throw({...}) or this.report({...}).",
		},
	},

	create(context) {
		return {
			ThrowStatement(node) {
				const argument = node.argument;
				if (!argument || argument.type !== 'NewExpression')
					return;
				if (argument.callee.type !== 'Identifier' || !RAW_ERROR_CTORS.has(argument.callee.name))
					return;
				if (!inPluginSubclass(node))
					return;

				context.report({
					node,
					messageId: 'rawThrow',
					data: { ctor: argument.callee.name },
				});
			},
		};
	},
};
