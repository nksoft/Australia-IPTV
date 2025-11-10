# AGENTS.md

## Build/Lint/Test Commands
- Build CSS: `npm run build` or `npx tailwindcss -i src/styles.css -o styles.css --minify` (requires Node.js and Tailwind CSS installed)
- No linting; add ESLint: `npx eslint script.js` (configure for ES6, browser env).
- No tests; add Jest: `npm init -y && npm install --save-dev jest` then `npx jest` or `npx jest --testNamePattern="test name"` for single test.

## Code Style Guidelines
- ES6+ syntax: const/let, arrow functions, async/await, template literals.
- Naming: camelCase for vars/functions, UPPER_CASE for constants, PascalCase for constructors.
- Indentation: 4 spaces; max line length 120 chars.
- Imports: ES6 modules if possible; currently global scripts.
- Formatting: Semicolons, single quotes, trailing commas in objects/arrays.
- DOM: Use querySelector/getElementById, addEventListener; avoid innerHTML for dynamic content.
- Error handling: try/catch for async ops, console.error/warn; graceful fallbacks.
- Storage: localStorage for persistence (e.g., favorites); JSON.parse/stringify.
- Comments: JSDoc for functions, inline for complex logic; keep concise.
- No TypeScript; consider adding for type safety if project grows.

## Cursor/Copilot Rules
- None found.