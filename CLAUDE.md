# express-pluss Development Guide

## Build & Development Commands
- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Test**: `npm run test` - Runs all Vitest tests
- **Test Single File**: `npm run test -- path/to/test.ts` - Run specific test
- **Lint**: `npm run lint` - Checks code with ESLint
- **Demo**: `npm run demo` - Runs example.ts using tsx

## Code Style Guidelines
- **Indentation**: 2 spaces
- **Formatting**: Semicolons required, trailing commas in multi-line structures
- **Imports**: Framework/libraries first, local modules second; named imports preferred
- **Types**: Strong TypeScript typing throughout, Zod for validation, generics when appropriate
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces/classes
- **Documentation**: JSDoc comments for exported functions
- **Error Handling**: Try/catch for external dependencies, explicit error messages with context
- **Architecture**: Builder pattern for configuration, middleware-based approach
- **Type Exports**: Use dedicated types.ts file for shared types