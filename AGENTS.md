# AGENTS.md

## Build/Lint/Test Commands
- Build CSS: `npm run build` (compiles src/styles.css to styles.css with Tailwind, requires Node.js)
- No linting; to add: `npm install --save-dev eslint` then configure for ES6/browser and run `npx eslint script.js`
- No tests; to add: `npm install --save-dev jest` then `npx jest` or `npx jest --testNamePattern="specific test"` for single test.

## Code Style Guidelines
- ES6+ syntax: const/let, arrow functions, async/await, template literals.
- Naming: camelCase for variables/functions, UPPER_CASE for constants, PascalCase for constructors/classes.
- Indentation: 4 spaces; max line length 120 chars.
- Imports: ES6 modules preferred; currently using global scripts in HTML.
- Formatting: Semicolons, single quotes, trailing commas in objects/arrays.
- DOM: querySelector/getElementById, addEventListener; avoid innerHTML for security/dynamic content.
- Error handling: try/catch for async ops, console.error/warn; provide graceful fallbacks.
- Storage: localStorage for persistence (e.g., favorites); use JSON.parse/stringify.
- Comments: JSDoc for functions, inline for complex logic; keep concise.
- No TypeScript; consider adding for type safety if project grows.
- Project structure: index.html (Australia IPTV), sltv.html (Sri Lanka IPTV), script.js, sltv.js, styles.css, package.json.

## Cursor/Copilot Rules
- None found.