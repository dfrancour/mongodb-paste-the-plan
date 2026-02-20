# MongoDB Paste the Plan

Browser-based tool to analyze and share MongoDB query explain plans with execution flow diagrams, SBE support, and indexing insights.

**[Try it live](https://dfrancour.dev/tools/mongodb-paste-the-plan)**

## Features

- **Explain plan visualization** - Paste any MongoDB `.explain()` output and get an interactive flow diagram
- **SBE support** - Full support for Slot-Based Engine (SBE) explain plans alongside classic engine plans
- **ESR analysis** - Automatic Equality-Sort-Range index analysis with actionable recommendations
- **Performance insights** - Color-coded stage performance, self-time analysis, and inefficiency detection
- **Plan sharing** - Share explain plans via compressed URL (no server required)
- **Stage glossary** - Complete reference for all MongoDB execution stages across pipeline, planning, and execution layers
- **Dark mode** - Full light/dark theme support

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to use the tool.

## Development

```bash
pnpm run check        # Lint + typecheck + test
pnpm run test         # Run tests in watch mode
pnpm run pre-push     # Full validation (format + lint + typecheck + test + build)
```

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript** strict mode
- **Tailwind CSS 4** for styling
- **Zod** for runtime validation
- **Vitest** for testing (513 tests)

## Using as a Library

This package exports raw `.tsx` source for consumption by other Next.js apps:

```bash
pnpm add mongodb-paste-the-plan@github:dfrancour/mongodb-paste-the-plan
```

```typescript
import { PasteThePlanContainer } from "mongodb-paste-the-plan/paste-the-plan";
import { GlossaryContainer } from "mongodb-paste-the-plan/stage-glossary";
```

The consuming app must:
1. Add `transpilePackages: ["mongodb-paste-the-plan"]` to `next.config.js`
2. Add `@source "../node_modules/mongodb-paste-the-plan/src/**/*.{ts,tsx}";` to your CSS for Tailwind scanning

## License

MIT
