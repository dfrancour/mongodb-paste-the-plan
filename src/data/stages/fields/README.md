# Explain Field Declarations

Structured metadata for the fields that appear in MongoDB explain output. Each execution stage declares the fields it emits, sourced from the C++ serialization code.

## Why fields live on stage definitions

MongoDB's explain output varies by stage. An `IXSCAN` emits `keysExamined`, `seeks`, and `dupsTested`; a `SORT` emits `memLimit`, `totalDataSizeSorted`, and spilling stats. This per-stage variation is not documented — it's defined implicitly by C++ `statsToBSON()` switch chains.

Field declarations make stages self-describing. Instead of hardcoding "SORT has a memLimit field" in extraction logic, the SORT definition carries that knowledge. Display, extraction, and analysis all read from the same source.

## How explain fields are serialized in MongoDB

Two code paths serialize execution stats, one per engine:

```text
Classic Engine                          SBE Engine
─────────────────────                   ─────────────────────
plan_explainer_impl.cpp                 plan_explainer_sbe.cpp
  statsToBSON()                           statsToBSONHelper()
    ├─ common fields (all stages)           ├─ common fields (all stages)
    └─ switch(stageType)                    └─ stage->debugInfo()
         per-stage fields                        per-stage fields
```

Each engine has a set of **common fields** that appear on every stage (nReturned, executionTimeMillisEstimate, works/opens/closes, etc.), plus **stage-specific fields** that vary.

The field names in explain output don't always match C++ member names. For example, `yields` in C++ becomes `saveState` in BSON. The `cppName` property on a field declaration tracks these renames.

## Composition model

```text
┌─────────────────────────────────┐
│  getFieldsForStage(stage)       │
│                                 │
│  = engine common fields         │   ← CLASSIC_COMMON_FIELDS or SBE_COMMON_FIELDS
│  + stage.explainFields          │   ← declared on each ExecutionStage definition
└─────────────────────────────────┘
```

Stage-specific fields compose with shared patterns via spread:

```typescript
// SORT definition
explainFields: [
  { bsonKey: "sortPattern", ... },
  { bsonKey: "memLimit", ... },
  ...SPILLING_FIELDS,              // ← shared across all spill-capable stages
]
```

Shared patterns:
- **`SPILLING_FIELDS`** — usedDisk, spills, spilledRecords, spilledBytes, spilledDataStorageSize. Used by SORT, SPOOL, TEXT_OR, group, hash_lookup, window.
- **`CBR_FIELDS`** — Cost-Based Ranker estimates (costEstimate, cardinalityEstimate). Infrastructure for when CBR ships as GA.

## How fields flow through the system

```text
Stage definition (explainFields)
        │
        ▼
Metrics extraction (metricsExtractor.ts)
  - Well-known fields → typed properties on `metrics` object
  - Declared stage-specific fields → index-signature entries on same `metrics` object
        │
        ▼
Display (stageDisplayFormatter.ts)
  - Formats values with units (bytes → "1.2 MB", ms → "340ms")
  - Filters out zero/default values (spills: 0 is noise)
  - Produces StageFieldDisplay[] for the UI
        │
        ▼
FlowNode component
  - Renders bsonKey with tooltip showing description + cppName
  - bsonKey is shown as-is to teach users to read raw explain JSON
```

## Directory structure

```text
fields/
├── README.md               # This file
├── common.ts               # Engine-specific common fields
├── spilling.ts             # Shared spilling fields (from spilling_stats.h)
├── cbr.ts                  # Cost-Based Ranker fields (infrastructure)
├── field_utilities.ts      # Lookup and composition functions
├── field_utilities.test.ts # Tests
└── index.ts                # Barrel export
```

## Adding field declarations to a stage

1. Find the stage name in `plan_explainer_impl.cpp` → `statsToBSON()` switch chain (Classic) or the corresponding `debugInfo()` method (SBE)
2. Read the `*Stats` struct in `plan_stats.h` (Classic) or `sbe/stages/plan_stats.h` (SBE) for field names and types
3. Note renames: if the C++ member is `yields` but the BSON key is `saveState`, set `cppName: "yields"`
4. Note verbosity gating: fields gated behind `kExecStats` get `verbosity: "executionStats"`; fields in queryPlanner output get `verbosity: "queryPlanner"`
5. If the stage can spill to disk, compose with `...SPILLING_FIELDS`
6. Add the `explainFields` array to the stage's `ExecutionStage` definition

## MongoDB source references

| What | File |
|------|------|
| Classic `statsToBSON()` | `src/mongo/db/query/plan_explainer_impl.cpp` |
| SBE `statsToBSONHelper()` | `src/mongo/db/query/plan_explainer_sbe.cpp` |
| Classic per-stage stat structs | `src/mongo/db/exec/plan_stats.h` |
| SBE per-stage stat structs | `src/mongo/db/exec/sbe/stages/plan_stats.h` |
| Shared spilling stats | `src/mongo/db/pipeline/spilling/spilling_stats.h` |
| Top-level summary stats | `src/mongo/db/query/plan_summary_stats.h` |
