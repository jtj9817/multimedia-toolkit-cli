# Google JavaScript Style Guide Summary (Bun.js Edition)

This document summarizes key rules from the Google JavaScript Style Guide, adapted for the **Bun.js** runtime.

## 1. Source File Basics
- **File Naming:** All lowercase, with underscores (`_`) or dashes (`-`). Extension must be `.js` (or `.ts` for TypeScript).
- **File Encoding:** UTF-8.
- **Whitespace:** Use only ASCII horizontal spaces (0x20). Tabs are forbidden for indentation.

## 2. Source File Structure
- New files should be ES modules (`import`/`export`).
- **Exports:** Use named exports (`export {MyClass};`). **Do not use default exports.**
- **Imports:** Do not use line-wrapped imports.

## 3. Formatting
- **Braces:** Required for all control structures (`if`, `for`, `while`, etc.), even single-line blocks. Use K&R style ("Egyptian brackets").
- **Indentation:** +2 spaces for each new block.
- **Semicolons:** Every statement must be terminated with a semicolon.
- **Column Limit:** 80 characters.
- **Line-wrapping:** Indent continuation lines at least +4 spaces.
- **Whitespace:** Use single blank lines between methods. No trailing whitespace.

## 4. Language Features
- **Variable Declarations:** Use `const` by default, `let` if reassignment is needed. **`var` is forbidden.**
- **Array Literals:** Use trailing commas. Do not use the `Array` constructor.
- **Object Literals:** Use trailing commas and shorthand properties. Do not use the `Object` constructor.
- **Classes:** Do not use JavaScript getter/setter properties (`get name()`). Provide ordinary methods instead.
- **Functions:** Prefer arrow functions for nested functions to preserve `this` context.
- **String Literals:** Use single quotes (`'`). Use template literals (`` ` ``) for multi-line strings or complex interpolation.
- **Control Structures:** Prefer `for-of` loops. `for-in` loops should only be used on dict-style objects.
- **`this`:** Only use `this` in class constructors, methods, or in arrow functions defined within them.
- **Equality Checks:** Always use identity operators (`===` / `!==`).

## 5. Disallowed Features
- `with` keyword.
- `eval()` or `Function(...string)`.
- Automatic Semicolon Insertion.
- Modifying builtin objects (`Array.prototype.foo = ...`).

## 6. Naming
- **Classes:** `UpperCamelCase`.
- **Methods & Functions:** `lowerCamelCase`.
- **Constants:** `CONSTANT_CASE` (all uppercase with underscores).
- **Non-constant Fields & Variables:** `lowerCamelCase`.

## 7. Bun.js Specific Guidelines

### 7.1 Runtime APIs
- **Native over Polyfill:** Always prefer `Bun.*` APIs (e.g., `Bun.file`, `Bun.write`, `Bun.serve`) over Node.js compatibility modules (`fs`, `http`) when possible.
- **Top-Level Await:** Leverage top-level await, which is natively supported.
  ```javascript
  const data = await Bun.file("config.json").json();
  ```

### 7.2 Testing
- **Framework:** Use `bun:test` exclusively.
- **Patterns:** Follow standard `describe`/`test` patterns imported from `bun:test`.

### 7.3 Environment
- **Variables:** Access environment variables directly via `process.env` or `Bun.env` without `dotenv`.