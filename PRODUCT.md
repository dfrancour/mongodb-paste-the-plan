# Product Context

## Target Persona

**Expert-focused tool for application developers and MongoDB administrators** who are technically savvy and need to quickly gain insight from MongoDB explain plans and share those insights with their team.

## Key Principles

- **Don't hide technical specifics** - Highlight them to help experts understand performance implications
- **Present information digestibly** - But maintain technical depth and accuracy
- **Enable quick insight gathering** - Experts need to rapidly identify performance issues
- **Support team collaboration** - Insights must be shareable with team members
- **Not a consumer product** - This is a professional tool for database performance analysis

## Domain Context

This tool helps MongoDB users understand query performance by:

1. **Visualizing execution plans** - Converting raw JSON explain output into intuitive flow diagrams
2. **Identifying performance bottlenecks** - Highlighting slow stages, missing indexes, and inefficient operations
3. **Analyzing query optimization** - Showing ESR (Equality-Sort-Range) compliance and plan selection
4. **Supporting multiple MongoDB versions** - Compatible with versions 4.4 through 8.0+
5. **Handling both execution engines** - Classic and SBE (Slot-Based Execution) plans

## User Journey

1. **Input** - User pastes MongoDB `explain("executionStats")` JSON output
2. **Parse** - System validates and normalizes the plan structure
3. **Visualize** - Flow diagram shows execution stages bottom-to-top
4. **Analyze** - Performance metrics, index usage, and optimization suggestions
5. **Share** - Export insights or share via URL with team members

## Technical Expertise Expected

Users should understand:

- MongoDB query syntax (`find`, `aggregate`)
- Index fundamentals (compound indexes, covered queries)
- Explain plan basics (COLLSCAN, IXSCAN, FETCH stages)
- Performance metrics (docsExamined, executionTimeMillis, nReturned)

The tool enhances their expertise by making complex plans digestible, not by simplifying away important details.

---

## Architecture

### Key Files

- `/src/types/explain-plan.ts` - Types
- `/src/lib/parsers/planParser.ts`
- `/src/lib/parsers/sbeParser.ts`
- `/src/lib/parsers/planParser.schemaCoverage.test.ts` - Schema coverage validation tests

The TypeScript types should be as rigid as possible while still allowing for real-life variation in MongoDB query explain plans. Validate changes via the test fixtures in `src/data/fixtures/`.

### Parsing Pipeline

1. **Input** - User pastes `explain("executionStats")` JSON
2. **Validation** - Parsed as `unknown`, validated via Zod schema
3. **Normalization** - Converted to deterministic flow structure using path-based IDs (e.g., `root`, `root.0.1`)
4. **Analysis** - Metrics extracted (`docsExamined`, `nReturned`, `executionTimeMillis`)
5. **Visualization** - Flow stages rendered using layout engine

### Schema Combinations

- **Contexts:** `queryPlanner`, `executionStats`, `allPlansExecution`
- **Execution Engines:** Classic, SBE (Slot-Based Execution)
- **Combinations:** 3 contexts × 2 engines = 6 format variants
- Unified `mongoStageSchema` supports all cases

### SBE Architecture Notes

- Parse `queryPlanStages` and `slotLineages`
- Generate `FlowStage[]` per `planNodeId`
- Map relationships bottom-up
- Use stage names, not SBE types, for visualization

### Path-Based ID System

- `root`, `root.0`, `root.0.1` for deterministic stage lookup
- Enables unique keying, stage identification, and visualization tree layout

### Sharded Plan Parsing

- Sharded plans include `shards[].executionStages`
- Recursively parse each shard's subtree
- Merge into global flow graph with `SHARD_MERGE` root

### Error Handling

- Unrecognized stage → `stage: 'UNKNOWN'`
- Missing metrics → default to `0`
- All parsing errors wrapped in `PlanParseError`

---

## Behavioral Testing

**Test Design Philosophy:**

- **Test behavior, not implementation** - Focus on architectural constraints and user expectations
- **Use real data** - All tests use actual MongoDB explain plans from `src/data/fixtures/`
  - If real situations lack adequate MongoDB Explain plan coverage, then we should prioritize getting more fixtures to test with
- **Enforce key patterns** - Prevent regression of critical lessons learned
- **High-level expectations** - Avoid brittle implementation details

**Key Test Patterns:**

```typescript
// Good: Tests behavior and constraints
expect(flowStages.filter(s => s.children.length > 1))
  .toSatisfy(mergeNodes => mergeNodes.every(node => node.position.y > 0))

// Avoid: Tests implementation details
expect(component.state.selectedNode).toBe('specific-id')
```

**Critical Test Categories:**

1. **Parsing Completeness** - Ensure all MongoDB formats extract full stage hierarchies
2. **Layout Integrity** - No overlapping positions, bottom-to-top flow maintained
3. **Type Safety** - Graceful handling of malformed input
4. **Expert Focus** - Meaningful database metrics extracted, not UI implementation details
5. **Format Compatibility** - All MongoDB versions and plan formats supported
