# @nomercy-entertainment/eslint-plugin-player

The player trio (core, video, music) shares one code standard. This plugin makes the mechanical parts of that standard enforceable, so a violation fails lint at write time instead of surfacing in review weeks later. It encodes only the rules that a machine can judge without guessing. Naming intent, comment usefulness, and architecture stay with the code-quality reviewer.

## Compatibility

These rules target the v2 player trio (the `2.0.x` line of `nomercy-player-core`, `nomercy-video-player`, and `nomercy-music-player`). This package keeps its own version line rather than matching the trio, because the rules evolve on their own cadence: a version bump here means a rule changed, not that the player did. Pin it independently and read this note for the player line it tracks.

## Rules

Every rule ships in the `recommended` preset at `error`.

| Rule | Catches |
|------|---------|
| `player/no-single-letter-ident` | Single-letter parameter and variable names. Allows `x` `y` `z` (maths) and `i` `j` `k` (loops). Covers interface method signatures and overloads, not just implementations. |
| `player/no-compat-vocab` | The v1 factory names, the `*StateToken` types, the `PlayerCore` class, and compat markers in comments (`@deprecated`, "compatible alias", `v1-compat`). The v2 classes `NMVideoPlayer` and `NMMusicPlayer` stay allowed. |
| `player/no-history-comments` | Bug-number history, spec citations (`§`), and naked `TODO`/`FIXME` with no issue reference. |
| `player/no-object-literal-cast` | `{ ... } as SomeType`. Type the object at construction instead. `as const` is exempt. |
| `player/no-unknown-cast` | `x as unknown as T` with no adjacent comment. A short justification on the same line or the line above keeps a structurally forced cast legal. |
| `player/no-raw-player-bus` | `this.player.on/once/off/emit(...)` inside a plugin. Bypasses scoping and auto-dispose; use the plugin's own `this.on/once/off/emit`. Only fires inside a class that `extends Plugin` — core mixins are untouched. |
| `player/no-raw-timers-in-plugin` | Raw `setTimeout`/`setInterval`/`requestAnimationFrame`/`addEventListener` inside a plugin. No auto-cleanup; use `this.timeout/interval/frame/listen`. |
| `player/no-raw-throw-in-plugin` | `throw new Error(...)` (and other raw error ctors) inside a plugin. Skips the structured error surface; use `this.throw({...})` or `this.report({...})`. Re-throwing a caught value is allowed. |
| `player/plugin-id-required` | A concrete class extending `Plugin` with no own `static id`. Inheriting the base default `'plugin'` collides and breaks storage/mount namespacing. `abstract` intermediate bases are exempt. |

## Wiring

The trio configs consume it from the sibling package:

```js
import player from '../eslint-plugin-player/index.js';

export default antfu({ /* ... */ }, {
  files: ['src/**/*.ts'],
  plugins: { player },
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
}, {
  files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
  rules: {
    'player/no-object-literal-cast': 'off',
    'player/no-unknown-cast': 'off',
    'player/no-raw-throw-in-plugin': 'off',
    'player/no-raw-timers-in-plugin': 'off',
    'player/no-raw-player-bus': 'off',
    'player/plugin-id-required': 'off',
  },
});
```

Test files relax the two cast rules (mock construction legitimately casts) and the four boundary rules (test-fixture plugins throw raw errors, use raw timers, and build ad-hoc plugin classes to drive the real paths).

## The boundary rules

`no-raw-player-bus`, `no-raw-timers-in-plugin`, and `no-raw-throw-in-plugin` are the mechanical half of the `this`-versus-`this.player` boundary: a plugin extends `this` and reaches the player through `this.player`, but its own lifecycle helpers (`this.on`, `this.timeout`, `this.throw`, ...) are the sanctioned surface because they scope and auto-clean. Reaching past them to the raw player bus, raw timers, or a raw `throw` leaks a listener or drops an error off the structured path. All three fire only inside a class that `extends Plugin`, so core mixins — where `this` already *is* the player — never trigger them. A genuinely-needed exception (a third-party emitter that is not an `EventTarget`, a deliberate re-emit of a dynamically-named player event) takes an `eslint-disable-next-line` with a one-line reason, the same escape hatch `no-unknown-cast` uses.

## Cross-file checks

Two things eslint cannot see (it lints one file at a time) ship as scripts for CI:

| Script | Asserts |
|--------|---------|
| `scripts/check-package-exports.mjs` | Every `exports` target resolves to a real file, and no subpath reaches into `src/`. |
| `scripts/check-duplicate-symbols.mjs` | No exported constant, type, or enum is byte-identical in both video and music. Identical bodies are shared code that belongs in core. |

```sh
npm run check:exports
npm run check:duplicates
```

## Tests

```sh
npm install
npm test
```
