// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Inside a plugin, ban the raw scheduling and listener primitives:
 * `setTimeout`, `setInterval`, `requestAnimationFrame`, and
 * `<target>.addEventListener`. None of them auto-clean, so a plugin that uses
 * them leaks a timer or listener past its own teardown. The plugin base ships
 * lifecycle-tracked equivalents — `this.timeout`, `this.interval`, `this.frame`,
 * `this.listen` — that the registry cancels on `dispose()`.
 *
 * Global-form calls (`setTimeout(...)`) and any-member `addEventListener`
 * (`el.addEventListener(...)`, `window.addEventListener(...)`) are both caught.
 * The plugin's own `this.timeout` / `this.listen` names never match, so the
 * sanctioned helpers stay clear.
 */

import { inPluginSubclass } from './_in-plugin-subclass.js';

const GLOBAL_TIMERS = new Map([
	['setTimeout', 'timeout'],
	['setInterval', 'interval'],
	['requestAnimationFrame', 'frame'],
]);

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Ban raw setTimeout/setInterval/requestAnimationFrame/addEventListener inside a plugin — use this.timeout/interval/frame/listen (auto-cleaned).',
		},
		schema: [],
		messages: {
			rawTimer: "Raw {{raw}}(...) inside a plugin has no auto-cleanup — use this.{{helper}}(...) instead.",
			rawListener: "Raw addEventListener(...) inside a plugin has no auto-cleanup — use this.listen(target, event, handler) instead.",
		},
	},

	create(context) {
		return {
			CallExpression(node) {
				const callee = node.callee;

				// Global timer form: setTimeout(...) / setInterval(...) / requestAnimationFrame(...)
				if (callee.type === 'Identifier' && GLOBAL_TIMERS.has(callee.name)) {
					if (!inPluginSubclass(node))
						return;
					context.report({
						node: callee,
						messageId: 'rawTimer',
						data: { raw: callee.name, helper: GLOBAL_TIMERS.get(callee.name) },
					});
					return;
				}

				// Member forms: <target>.addEventListener(...) and window.setTimeout(...) etc.
				if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
					const method = callee.property.name;
					if (method === 'addEventListener') {
						if (!inPluginSubclass(node))
							return;
						context.report({ node: callee, messageId: 'rawListener' });
						return;
					}
					if (GLOBAL_TIMERS.has(method)) {
						if (!inPluginSubclass(node))
							return;
						context.report({
							node: callee,
							messageId: 'rawTimer',
							data: { raw: method, helper: GLOBAL_TIMERS.get(method) },
						});
					}
				}
			},
		};
	},
};
