// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Inside a plugin, ban the global `fetch` (bare `fetch(...)`,
 * `window.fetch(...)`, `globalThis.fetch(...)`). The plugin base ships
 * `this.fetch()`, which runs the player's auth pipeline — bearer token,
 * `transformUrl`, header merge, `signRequest`, a one-shot 401 refresh-and-retry,
 * RetryConfig on 5xx/network — and aborts automatically on `dispose()`. A raw
 * fetch skips ALL of that: it sends no `Authorization`, so it 401s against a
 * self-hosted server, and it never aborts when the plugin tears down.
 *
 * This is the auth-and-lifecycle half of the this.player boundary, the same
 * class as no-raw-player-bus and no-raw-timers-in-plugin. It fires only inside
 * a class that `extends Plugin`, so core internals are untouched. `this.fetch`
 * never matches (it is a member call, not the global). A genuinely-needed raw
 * fetch (a public URL that must NOT carry auth) takes an eslint-disable with a
 * one-line reason.
 */

import { inPluginSubclass } from './_in-plugin-subclass.js';

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Ban the global fetch inside a plugin — use this.fetch() (auth pipeline + abort-on-dispose).',
		},
		schema: [],
		messages: {
			rawFetch: "Global {{form}} inside a plugin sends no auth and never aborts on dispose — use this.fetch(url, options?) instead.",
		},
	},

	create(context) {
		return {
			CallExpression(node) {
				const callee = node.callee;
				let form;

				// Bare global form: fetch(...)
				if (callee.type === 'Identifier' && callee.name === 'fetch') {
					form = 'fetch(...)';
				}
				// Member form: window.fetch(...) / globalThis.fetch(...) / self.fetch(...)
				else if (
					callee.type === 'MemberExpression'
					&& !callee.computed
					&& callee.property.type === 'Identifier'
					&& callee.property.name === 'fetch'
					&& callee.object.type === 'Identifier'
					&& (callee.object.name === 'window' || callee.object.name === 'globalThis' || callee.object.name === 'self')
				) {
					form = `${callee.object.name}.fetch(...)`;
				}
				else {
					return;
				}

				if (!inPluginSubclass(node))
					return;

				context.report({
					node: callee,
					messageId: 'rawFetch',
					data: { form },
				});
			},
		};
	},
};
