// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

/**
 * Every concrete plugin must declare its own `static readonly id`. The `Plugin`
 * base defaults `id` to the string `'plugin'`, so a subclass that forgets to
 * override it does not fail to compile — it silently ships with the id
 * `'plugin'`, which collides with the base default and any other forgetful
 * plugin, and breaks storage/mount namespacing (both key off the id).
 *
 * The rule fires on a class that `extends Plugin` (directly, `core.Plugin`, or
 * the generic form `Plugin<...>`) and has no own `static id` field. It does not
 * judge the id's VALUE — vendoring-prefix convention (`'fillz:viz'` for external
 * authors) depends on which package owns the file and stays a review concern.
 *
 * Abstract intermediate bases are exempt: a class marked `abstract` is a shared
 * base other plugins extend, not a registered plugin, so it legitimately defers
 * the id to its concrete subclasses.
 */

/**
 * @param {import('estree').Node | undefined} superClass
 * @returns {boolean}
 */
function extendsPlugin(superClass) {
	if (!superClass)
		return false;
	if (superClass.type === 'Identifier')
		return superClass.name === 'Plugin';
	if (superClass.type === 'MemberExpression')
		return superClass.property?.type === 'Identifier' && superClass.property.name === 'Plugin';
	if (superClass.type === 'TSInstantiationExpression')
		return extendsPlugin(superClass.expression);
	return false;
}

/**
 * True when `member`'s key is `id` — a plain `id` identifier or the computed /
 * quoted string-literal `'id'` form.
 *
 * @param {import('estree').Node} member
 * @returns {boolean}
 */
function keyIsId(member) {
	const key = member.key;
	if (key.type === 'Identifier')
		return key.name === 'id';
	if (key.type === 'Literal')
		return key.value === 'id';
	return false;
}

/**
 * True when the class body declares an own `static id` (any access modifier).
 * Matches a static field (`static id = ...`, `static ['id'] = ...`) or a static
 * getter (`static get id() {...}`).
 *
 * @param {import('estree').Node} classNode
 * @returns {boolean}
 */
function declaresStaticId(classNode) {
	return classNode.body.body.some((member) => {
		if (member.static !== true)
			return false;
		if (member.type === 'PropertyDefinition')
			return keyIsId(member);
		if (member.type === 'MethodDefinition' && member.kind === 'get')
			return keyIsId(member);
		return false;
	});
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Require every concrete class extending Plugin to declare its own static readonly id.',
		},
		schema: [],
		messages: {
			missingId: "A plugin (class extending Plugin) must declare its own `static override readonly id` — inheriting the base default 'plugin' collides and breaks storage/mount namespacing.",
		},
	},

	create(context) {
		function check(node) {
			if (!extendsPlugin(node.superClass))
				return;
			// `abstract class` intermediate bases legitimately defer the id.
			if (node.abstract === true)
				return;
			if (declaresStaticId(node))
				return;
			context.report({
				node: node.id ?? node,
				messageId: 'missingId',
			});
		}

		return {
			ClassDeclaration: check,
			ClassExpression: check,
		};
	},
};
