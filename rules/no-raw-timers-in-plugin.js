// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Inside a plugin, ban the raw scheduling, listener, and observer primitives:
 * `setTimeout`, `setInterval`, `requestAnimationFrame`,
 * `<target>.addEventListener`, and `new ResizeObserver` (and the other DOM
 * observers). None of them auto-clean, so a plugin that uses them leaks a timer,
 * listener, or observer past its own teardown. The plugin base / lifecycle
 * registry ship tracked equivalents — `this.timeout`, `this.interval`,
 * `this.frame`, `this.listen`, and `this.lifecycle.observe(...)` — that the
 * registry cancels or disconnects on `dispose()`.
 *
 * Global-form calls (`setTimeout(...)`) and any-member `addEventListener`
 * (`el.addEventListener(...)`, `window.addEventListener(...)`) are both caught,
 * as is `new ResizeObserver(...)` and the sibling observers. The plugin's own
 * `this.timeout` / `this.listen` names never match, so the sanctioned helpers
 * stay clear.
 */

import { inPluginSubclass } from './_in-plugin-subclass.js';

const GLOBAL_TIMERS = new Map([
	['setTimeout', 'timeout'],
	['setInterval', 'interval'],
	['requestAnimationFrame', 'frame'],
]);

// DOM observers with a disconnect() lifecycle — wrap with this.lifecycle.observe().
const OBSERVERS = new Set([
	'ResizeObserver',
	'MutationObserver',
	'IntersectionObserver',
	'PerformanceObserver',
]);

/**
 * True when `node` (a `new Observer(...)`) is the direct argument of a
 * `this.lifecycle.observe(...)` call — the sanctioned, already-tracked wrap.
 *
 * @param {import('estree').NewExpression & { parent?: any }} node
 * @returns {boolean}
 */
function isLifecycleObserveArgument(node) {
	const call = node.parent;
	if (!call || call.type !== 'CallExpression' || call.arguments[0] !== node)
		return false;
	const callee = call.callee;
	// callee must be `<something>.observe`
	if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier' || callee.property.name !== 'observe')
		return false;
	// `<something>` must be `this.lifecycle`
	const object = callee.object;
	return object.type === 'MemberExpression'
		&& !object.computed
		&& object.object.type === 'ThisExpression'
		&& object.property.type === 'Identifier'
		&& object.property.name === 'lifecycle';
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Ban raw setTimeout/setInterval/requestAnimationFrame/addEventListener/observers inside a plugin — use this.timeout/interval/frame/listen and this.lifecycle.observe (auto-cleaned).',
		},
		schema: [],
		messages: {
			rawTimer: "Raw {{raw}}(...) inside a plugin has no auto-cleanup — use this.{{helper}}(...) instead.",
			rawListener: "Raw addEventListener(...) inside a plugin has no auto-cleanup — use this.listen(target, event, handler) instead.",
			rawObserver: "Raw new {{observer}}(...) inside a plugin never disconnects on dispose — wrap it: this.lifecycle.observe(new {{observer}}(...)).",
		},
	},

	create(context) {
		return {
			NewExpression(node) {
				if (node.callee.type !== 'Identifier' || !OBSERVERS.has(node.callee.name))
					return;
				if (!inPluginSubclass(node))
					return;
				// The sanctioned wrap is the exception: `this.lifecycle.observe(new ResizeObserver(cb))`.
				// When this NewExpression is the direct argument of a `*.observe(...)` call whose
				// callee reads `this.lifecycle.observe`, it is already lifecycle-tracked — allow it.
				if (isLifecycleObserveArgument(node))
					return;
				context.report({
					node: node.callee,
					messageId: 'rawObserver',
					data: { observer: node.callee.name },
				});
			},
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
