# MongoDB Paste the Plan

This project is a web app composed of two main sections:

- **mongodb-paste-the-plan**: A tool for visualizing and sharing MongoDB query explain plans
- **mongodb-stage-glossary**: A companion tool that supports browsing the MongoDB query stage catalog

---

## On-Demand Documentation

- **PRODUCT.md** - Product context, architecture, parsing pipeline, testing philosophy
- **src/data/stages/README.md** - MongoDB stage catalog

---

## Repository Rules

### Pre-Commit Validation

- No job is finished until you have run `pnpm run pre-push`
- This runs: format check → lint → typecheck → test → **build**
- If any step fails, fix issues before proceeding

### Planning & Task Management

- **IMPORTANT: Start every feature with: "Let me research the codebase and create a plan before implementing"**
- YOU MUST use a task list for tasks with 3+ steps
- Mark tasks as in_progress BEFORE starting work
- Mark tasks as completed IMMEDIATELY after finishing (don't batch)
- Only ONE task should be in_progress at a time

### Code Quality

- **NEVER use TypeScript `any` type** - use `unknown` with Zod validation
- NEVER add version suffixes to names (processV2, handleNew, ClientOld)
- NEVER add historical comments - code describes current state, git shows history
- NEVER skip tests for complex business logic

---

## Core Workflow: Research → Plan → Implement → Validate

1. **Research** - Understand existing patterns using Task tool (Explore agent), read files in parallel, search for similar functionality
2. **Plan** - Propose approach, break into task list items.
3. **Implement** - TDD for complex logic, code-first for simple CRUD, keep functions small, use parallel tool calls
4. **Validate** - Run `pnpm run pre-push`, review task list completion, verify tests and build succeed

---

## Common Development Commands

### Pre-Commit Validation (Required Before Every Commit)

```bash
pnpm run pre-push          # CRITICAL: Full validation pipeline
                           # Runs: format:check → check → build
                           # ALWAYS run before git commit/push
```

### Testing & Quality Checks

```bash
pnpm run check             # Lint + typecheck + test (during development)
pnpm run test              # Run all tests with Vitest (watch mode)
pnpm run test:run          # Run all tests once
pnpm run test:run <pattern> # Run specific test file
```

### Type & Lint Checking

```bash
pnpm run typecheck         # TypeScript errors only (when debugging types)
pnpm run lint              # ESLint errors only (when debugging lints)
pnpm run format:check      # Check code formatting without fixing
```

### Development & Build

```bash
pnpm install               # Install dependencies (after package.json changes)
pnpm run dev               # Start dev server (UI development)
pnpm run build             # Production build (validates SSG/RSC)
```

---

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **TypeScript** strict mode
- **Tailwind CSS 4** for styling
- **Zod 4** for runtime validation
- **Vitest 4** for testing
- **No database** - user data is not stored
- **Subpath imports** - `#components/*`, `#lib/*`, `#types/*`, `#data/*`, `#hooks/*`, `#test-utils/*`

---

## Architecture Principles

### This is Always a Feature Branch

- Delete old code completely - no deprecation needed
- Code ought to read naturally for the current state; history lives in git, not comments or versioned names
- No migration code unless explicitly requested

### Prefer Explicit Over Implicit

- Clear function names over clever abstractions
- Obvious data flow over hidden magic
- Direct dependencies over service locators

### Keep Functions Small and Focused

- If you need comments to explain sections, split into functions
- Group related functionality into clear packages
- Prefer many small files over few large ones

---

## Problem Solving

**When stuck:** Stop. Think. The simple solution is usually correct. What would it look like if it were easy?

**When uncertain:** Don't guess. Research first. Say: "Let me research the existing implementation before proceeding."

**When choosing:** Present options. Say: "I see approach A (simple) vs B (flexible). Which do you prefer?"

Your redirects prevent over-engineering. When uncertain, stop and ask for guidance.

---

## Anti-Patterns — NEVER Do This

**Jump to code without research** - Always research existing patterns first, then plan, then get approval

**Create new files before checking existing** - Search for existing utilities before creating duplicates
