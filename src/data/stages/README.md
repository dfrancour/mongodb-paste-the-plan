# MongoDB Stages Reference

A TypeScript catalog of every stage in MongoDB's query pipeline. Powers [MongoDB Paste the Plan](https://www.dfrancour.dev/tools/mongodb-paste-the-plan) and the [Stage Glossary](https://www.dfrancour.dev/tools/mongodb-stage-glossary).

Each stage carries structured metadata: descriptions, icons, performance characteristics, categories, and cross-references between layers. The catalog maps directly to MongoDB's internal architecture so that visualization and analysis tools can treat explain output as structured data rather than opaque strings.

## Query architecture

MongoDB processes a query through three layers, each with its own naming convention and section in explain output.

```
  User writes                  $group, $match, $sort
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Pipeline Layer                                         │
  │  Validates syntax. Sequences stages. Decides what the   │
  │  user is asking for.                                    │
  │  Names: $lowercase ($group, $match, $lookup)            │
  └─────────────────────────────────────────────────────────┘
                                  │
                          query planning
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Planning Layer (QuerySolution)                         │
  │  Chooses indexes. Reorders operations. Picks sort       │
  │  strategies. Produces a tree of QuerySolutionNodes.     │
  │  Names: UPPER_CASE (GROUP, IXSCAN, FETCH)               │
  └─────────────────────────────────────────────────────────┘
                                  │
                          stage building
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Execution Layer                                        │
  │  Actually moves data. Two engine implementations:       │
  │                                                         │
  │  SBE (Slot-Based Engine)     Classic Engine             │
  │  Names: lower_case           Names: UPPER_CASE          │
  │  group, filter, scan         COLLSCAN, IXSCAN, FETCH    │
  └─────────────────────────────────────────────────────────┘
```

### Example: `$group` through all three layers

```jsonc
// db.orders.explain("executionStats").aggregate([{ $group: ... }])
{
  "queryPlanner": {
    "winningPlan": {
      "queryPlan": {
        "stage": "GROUP",           // ← Planning layer
        "planNodeId": 2,
        "inputStage": {
          "stage": "COLLSCAN",      // ← Planning layer
          "planNodeId": 1
        }
      }
    }
  },
  "executionStats": {
    "executionStages": {
      "stage": "group",             // ← Execution layer (SBE)
      "planNodeId": 2,
      "inputStage": {
        "stage": "scan",            // ← Execution layer (SBE)
        "planNodeId": 1
      }
    }
  }
}
```

The `planNodeId` field bridges the two trees -- planning node 2 (`GROUP`) is implemented by execution node 2 (`group`).

Note that Classic execution stages use UPPER_CASE, identical to planning stage names. This is a naming coincidence, not an identity. SBE makes the distinction visible: the planning tree says `GROUP` while the execution tree says `group`.

## Data model

### Layers

| Layer | TypeScript type | ID convention |
|-------|----------------|---------------|
| Pipeline | `PipelineStage` | `$lowercase` |
| Planning | `PlanningStage` | `UPPER_CASE` |
| Execution | `ExecutionStage` | `lower_case` (SBE) / `UPPER_CASE` (Classic) |
| Mongos | `MongosStage` | varies |

### Stage store

All stages live in a single `STAGES` object, keyed by layer. Planning and classic execution stages both use UPPER_CASE names, but they live in separate sub-dictionaries so there's no ambiguity.

The primary lookup function is `getStage(layer, name)` — the caller must declare which layer they're asking about, because the same string (e.g. `"COLLSCAN"`) means different things in different sections of explain output:

```typescript
getStage("planning", "GROUP")      // → planning GROUP (from queryPlan tree)
getStage("execution", "group")     // → SBE group (from executionStages tree)
getStage("execution", "COLLSCAN")  // → classic COLLSCAN (from executionStages tree)
getStage("pipeline", "$match")     // → pipeline $match
```

### Cross-layer relationships

Relationships point upward from lower layers:

```
Pipeline ($group)
    ↑ builtFromUserSyntax        (declared on the planning stage)
Planning (GROUP)
    ↑ querySolutionStageType     (declared on the execution stage)
Execution (SBE group)
```

- **`builtFromUserSyntax`** on planning stages points to the pipeline stage(s) they optimize. The planner translates `$group` into a `GROUP` node.
- **`querySolutionStageType`** on execution stages points to the planning layer via the `QuerySolutionStageType` enum. Links `group` (SBE) back to `STAGE_GROUP` (planning).

Pipeline stages do not point downward. That relationship is computed at runtime via `getImplementations()`.

### `QuerySolutionStageType` enum

Mirrors the C++ `StageType` enum in `stage_types.h`. The `QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME` map mirrors `nodeStageTypeToString()`. Together these are the source of truth for how internal stage type identifiers map to explain output strings.

Special cases:
- `STAGE_SORT_DEFAULT` and `STAGE_SORT_SIMPLE` both produce `"SORT"` in explain output
- `STAGE_COLLSCAN` conditionally produces `"CLUSTERED_IXSCAN"` when the collection has a clustered index
- `UNPACK_SAMPLED_TS_BUCKET` and `INDEX_PROBE_NODE` have no corresponding execution stage -- they exist in the query solution tree but have no SBE builder implementation

## Type system

Discriminated unions on the `layer` field, with branded ID types to prevent mixing identifiers across layers.

```typescript
type PipelineStage = {
  layer: "pipeline";
  id: PipelineStageId;       // branded string
  fullName: string;
  description: string;
  category: StageCategory;
  iconName: StageIconName;
};

type PlanningStage = {
  layer: "planning";
  id: PlanningStageId;
  querySolutionStageType: QuerySolutionStageType;
  builtFromUserSyntax?: PipelineStageId[];
  blockingStage: boolean;
  canSpillToDisk: boolean;
  // ...base metadata
};

type ExecutionStage = {
  layer: "execution";
  engine: "sbe" | "classic";
  id: ExecutionStageId;
  querySolutionStageType?: QuerySolutionStageType;
  blockingStage: boolean;
  canSpillToDisk: boolean;
  // ...base metadata
};
```

Branded IDs via the `StageIds` helper:

```typescript
StageIds.pipeline("$group")      // PipelineStageId
StageIds.planning("GROUP")       // PlanningStageId
StageIds.execution("group")      // ExecutionStageId
```

Type guards narrow the union:

```typescript
if (isPlanningStage(stage)) {
  stage.querySolutionStageType;  // ✓ available
  stage.engine;                  // ✗ compile error
}
```

## API overview

All exports live in `stage_utilities.ts`. See the source for full signatures.

**Primary lookup:** `getStage(layer, name)` — returns a stage definition or `undefined`. The caller must specify the layer.

**Enumeration:** `getAllStages()` returns every stage across all layers. `getStageAnchorId(stage)` produces a unique anchor string (e.g. `classic-COLLSCAN`, `planning-GROUP`).

**Cross-layer traversal:**

| Function | What it does |
|----------|-------------|
| `getImplementations(pipelineId)` | Find all planning stages built from a pipeline stage |
| `getPipelineStageFor(executionId)` | Traverse execution → planning → pipeline to find the user syntax |
| `getStagesByEngine(engine)` | Get all execution stages for `"sbe"` or `"classic"` |
| `getStagesByQuerySolutionType(type)` | Find all stages sharing a `QuerySolutionStageType` |
| `getEngineSupport(pipelineId)` | Compute `{ sbe: "full"|"none", classic: "full"|"none" }` |

## Directory structure

```
stages/
├── README.md                    # This file
├── types.ts                     # Type definitions and type guards
├── stage_utilities.ts           # Lookup functions and dictionaries
├── index.ts                     # Barrel export
├── TEMPLATE.ts                  # Examples for adding new stages
│
├── pipeline/                    # Pipeline stages
│   ├── $match.ts
│   ├── $group.ts
│   └── ...
│
├── planning/                    # Planning stages
│   ├── GROUP.ts
│   ├── COLLSCAN.ts
│   ├── IXSCAN.ts
│   └── ...
│
├── execution/
│   ├── sbe/                     # SBE execution stages
│   │   ├── group.ts
│   │   ├── scan.ts
│   │   └── ...
│   └── classic/                 # Classic execution stages
│       ├── COLLSCAN.ts
│       ├── IXSCAN.ts
│       └── ...
│
└── mongos/                      # Mongos coordination stages
    ├── SINGLE_SHARD.ts
    └── ...
```

## Adding new stages

See `TEMPLATE.ts` for copy-paste examples. Rules:

1. Planning stage descriptions explain **what** the planner decided (strategy)
2. Execution stage descriptions explain **how** the engine does the work (implementation)
3. `builtFromUserSyntax` goes on **planning** stages, not execution stages
4. `querySolutionStageType` goes on **execution** stages to link back to planning
5. Planning stage IDs must exactly match `nodeStageTypeToString()` output from the C++ source
6. Always use `as const` for deep readonly

## MongoDB source references

| What | File |
|------|------|
| `StageType` enum | `src/mongo/db/query/compiler/physical_model/query_solution/stage_types.h` |
| `nodeStageTypeToString()` | `src/mongo/db/query/compiler/physical_model/query_solution/stage_types.cpp` |
| `QuerySolutionNode` subclasses | `src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h` |
| Explain serialization (planning tree) | `src/mongo/db/query/plan_explainer_sbe.cpp` |
| SBE stage builder | `src/mongo/db/query/stage_builder/sbe/builder.cpp` |
| Classic stage builder | `src/mongo/db/query/stage_builder/classic_stage_builder.cpp` |
| Pipeline document sources | `src/mongo/db/pipeline/document_source_*.h` |
| SBE execution stages | `src/mongo/db/exec/sbe/stages/*.h` |
| Classic execution stages | `src/mongo/db/exec/classic/*.h` |
