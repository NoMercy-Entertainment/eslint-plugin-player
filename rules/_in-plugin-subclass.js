// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Shared predicate for the three "inside a plugin body" rules
 * (no-raw-player-bus, no-raw-timers-in-plugin, no-raw-throw-in-plugin).
 *
 * A node is "in a plugin subclass" when its nearest enclosing class extends a
 * superclass named `Plugin` — bare `Plugin`, a member like `core.Plugin`, or a
 * generic application `Plugin<NMVideoPlayer>`. Core mixins compose onto a player
 * prototype and legitimately use raw `this.emit` / timers; they are NOT plugin
 * subclasses, so this predicate keeps them clear.
 *
 * The check stops at the NEAREST enclosing class, so a nested helper class
 * inside a plugin method is judged by ITS own `extends`, not the outer
 * plugin's — an ad-hoc `class Foo {}` declared inside `use()` is not a plugin
 * and its raw timers are its own concern.
 */

/**
 * @param {import('estree').Node | undefined} superClass
 * @returns {boolean}
 */
function extendsPlugin(superClass) {
	if (!superClass)
		return false;
	// `extends Plugin` / `extends SomeOther`
	if (superClass.type === 'Identifier')
		return superClass.name === 'Plugin';
	// `extends core.Plugin`
	if (superClass.type === 'MemberExpression')
		return superClass.property?.type === 'Identifier' && superClass.property.name === 'Plugin';
	// `extends Plugin<NMVideoPlayer, Opts>` — the parser models this as the
	// class heritage carrying `superTypeArguments`; the callee is still the
	// Identifier/MemberExpression above.
	if (superClass.type === 'TSInstantiationExpression')
		return extendsPlugin(superClass.expression);
	return false;
}

/**
 * True when `node` sits inside the body of a class that `extends Plugin`.
 *
 * @param {import('eslint').Rule.Node} node
 * @returns {boolean}
 */
export function inPluginSubclass(node) {
	let current = node.parent;
	while (current) {
		if (current.type === 'ClassDeclaration' || current.type === 'ClassExpression') {
			// Nearest enclosing class decides — a nested non-plugin class inside a
			// plugin method is judged by its OWN extends, not the outer plugin's.
			return extendsPlugin(current.superClass);
		}
		current = current.parent;
	}
	return false;
}
