# Contributing

Thanks for your interest in contributing to MongoDB Paste the Plan!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Start the dev server: `pnpm dev`
4. Run tests: `pnpm test`

## Before Submitting a PR

Run the full validation pipeline:

```bash
pnpm run pre-push
```

This runs format check, lint, typecheck, tests, and build. All must pass.

## Code Style

- **TypeScript strict mode** - No `any` types; use `unknown` with Zod validation
- **Prettier** handles formatting (configured with Tailwind plugin)
- **ESLint** with Next.js and TypeScript rules
- **Test behavior, not implementation** - Focus on what the code does, not how

## Project Structure

```
src/
  components/     # React components (paste-the-plan, stage-glossary, shared, common)
  lib/            # Business logic (parsers, analyzers, renderers, visualization)
  types/          # TypeScript types and Zod schemas
  data/           # Stage definitions and reference data
  hooks/          # React hooks
  test-utils/     # Test helpers and fixtures
```

## Adding a New Stage Definition

Stage definitions live in `src/data/stages/`. Each stage has metadata including category, description, layer, engine, and icon. See existing definitions for the pattern.

## Reporting Issues

Please include:
- The explain plan JSON (or a minimal reproducer)
- Expected vs actual behavior
- Browser and OS
