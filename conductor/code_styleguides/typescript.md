# Google TypeScript Style Guide Summary (Bun.js Edition)

This document summarizes key rules from the Google TypeScript Style Guide, adapted for the **Bun.js** runtime.

## 1. Language Features
- **Variable Declarations:** Always use `const` or `let`. **`var` is forbidden.** Use `const` by default.
- **Modules:** Use ES6 modules (`import`/`export`). **Do not use `namespace`.**
- **Exports:** Use named exports (`export {MyClass};`). **Do not use default exports.**
- **Classes:**
  - **Do not use `#private` fields.** Use TypeScript's `private` visibility modifier.
  - Mark properties never reassigned outside the constructor with `readonly`.
  - **Never use the `public` modifier** (it's the default). Restrict visibility with `private` or `protected` where possible.
- **Functions:** Prefer function declarations for named functions. Use arrow functions for anonymous functions/callbacks.
- **String Literals:** Use single quotes (`'`). Use template literals (`` ` ``) for interpolation and multi-line strings.
- **Equality Checks:** Always use triple equals (`===`) and not equals (`!==`).
- **Type Assertions:** **Avoid type assertions (`x as SomeType`) and non-nullability assertions (`y!`)**. If you must use them, provide a clear justification.

## 2. Disallowed Features
- **`any` Type:** **Avoid `any`**. Prefer `unknown` or a more specific type.
- **Wrapper Objects:** Do not instantiate `String`, `Boolean`, or `Number` wrapper classes.
- **Automatic Semicolon Insertion (ASI):** Do not rely on it. **Explicitly end all statements with a semicolon.**
- **`const enum`:** Do not use `const enum`. Use plain `enum` instead.
- **`eval()` and `Function(...string)`:** Forbidden.

## 3. Naming
- **`UpperCamelCase`:** For classes, interfaces, types, enums, and decorators.
- **`lowerCamelCase`:** For variables, parameters, functions, methods, and properties.
- **`CONSTANT_CASE`:** For global constant values, including enum values.
- **`_` Prefix/Suffix:** **Do not use `_` as a prefix or suffix** for identifiers, including for private properties.

## 4. Type System
- **Type Inference:** Rely on type inference for simple, obvious types. Be explicit for complex types.
- **`undefined` and `null`:** Both are supported. Be consistent within your project.
- **Optional vs. `|undefined`:** Prefer optional parameters and fields (`?`) over adding `|undefined` to the type.
- **`Array<T>` Type:** Use `T[]` for simple types. Use `Array<T>` for more complex union types (e.g., `Array<string | number>`).
- **`{}` Type:** **Do not use `{}`**. Prefer `unknown`, `Record<string, unknown>`, or `object`.

## 5. Comments and Documentation
- **JSDoc:** Use `/** JSDoc */` for documentation, `//` for implementation comments.
- **Redundancy:** **Do not declare types in `@param` or `@return` blocks** (e.g., `/** @param {string} user */`). This is redundant in TypeScript.
- **Add Information:** Comments must add information, not just restate the code.

## 6. Bun.js Specific Guidelines

### 6.1 Native APIs & Performance
- **File I/O:** Use `Bun.file()` and `Bun.write()` instead of `fs` module.
  ```typescript
  // ✅ Correct
  const text = await Bun.file("data.txt").text();
  await Bun.write("out.txt", text);
  ```
- **HTTP Server:** Use `Bun.serve()` instead of Express/Fastify.
  ```typescript
  Bun.serve({
    fetch(req) { return new Response("Hello!"); }
  });
  ```
- **Shell Commands:** Use the `$` shell tag.
  ```typescript
  import { $ } from "bun";
  await $`echo "Hello World"`;
  ```
- **Hashing:** Use `Bun.password` for bcrypt/argon2 hashing.

### 6.2 Testing (`bun:test`)
- **Runner:** Use `bun test`. Do not use Jest/Vitest.
- **Imports:** Import strict test utilities from `bun:test`.
  ```typescript
  import { describe, test, expect } from "bun:test";
  ```
- **Structure:** Group tests with `describe`, use `test` (not `it`).

### 6.3 Configuration (`bunfig.toml` & `tsconfig.json`)
- **Module Resolution:** Ensure `tsconfig.json` uses `"moduleResolution": "bundler"` and `"strict": true`.
- **Bun Config:** Place runtime settings in `bunfig.toml`.

### 6.4 Environment Variables
- **Access:** Use `process.env` or `Bun.env`. `.env` files are loaded automatically.
  ```typescript
  const dbUrl = Bun.env.DATABASE_URL;
  ```

### 6.5 Module System
- **ESM Only:** Write code using ES Modules (`import`/`export`).
- **Extensions:** Imports should include extensions if following strict native ESM, though Bun allows omitting them for `.ts` files. Prefer explicit extensions or cleaner import paths defined in `tsconfig.json`.