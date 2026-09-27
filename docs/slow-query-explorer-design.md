# MongoDB Slow Query Explorer — Design

Third tool in the MongoDB Paste the Plan suite. Input is a MongoDB slow-query
log (structured JSON log lines); output is an interactive workload analysis.

---

## 1. Purpose and persona

Same persona as Paste the Plan: application developers and DBAs who already
understand `docsExamined`, `planSummary`, and index fundamentals. Paste the Plan
answers "why is **this** query slow?". Slow Query Explorer answers the question
that comes before it: "**which** queries are slow, and which ones matter?"

The questions an expert brings to a slow log, in order of frequency:

1. **Where does the time go?** Which query shapes, namespaces, or commands
   dominate cumulative time.
2. **What is the worst offender?** Slowest single operations, worst
   document efficiencies, collection scans.
3. **Consistently bad or occasionally bad?** Average against max per group.
   The log only holds operations over the slow threshold, so percentiles of
   it describe the tail, not the query.
4. **What does the query look like, and why?** Command, plan summary, metrics
   for one entry.
5. **When?** Bursts vs. steady load across the capture window.

Design principles inherited from PRODUCT.md and applied here:

- Don't hide specifics; surface every recorded metric with its real name.
- All processing is client-side. Logs contain query values, which are often
  PII, so nothing leaves the browser and nothing is encoded into URLs.
- Input is `unknown`, validated by Zod, normalized into a rigid type.
- Behavior tests run against real, generated fixtures.
- Small files, explicit names, no versioned names, no historical comments.

---

## 2. Domain model

### 2.1 Input formats

All formats reduce to "a list of records that might be slow-query entries".

| Format                      | How users get it                          | Detection                                                  |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| JSONL structured log (4.4+) | `mongod.log`, Atlas log download          | One JSON object per line with `t`, `s`, `c`, `msg`, `attr` |
| JSON array of log objects   | Users who `jq -s` or export from a viewer | Text starts with `[`                                       |
| Single log object           | One line pasted from a log                | Object with `msg` and `attr`                               |

Out of scope: pre-4.4 plain-text log lines, `getLog` output, profiler
documents, and mongosh relaxed syntax. Each would be an adapter in
`parse/splitRecords.ts` that never touches the normalizer.

Mixed files are fine: a log contains many message types. Non-slow-query
records are counted and reported as "skipped", never silently dropped, and
lines that are not JSON are reported by line number.

### 2.2 Normalized entry

`src/types/slow-query.ts` defines `SlowQueryEntry`. Rigid where MongoDB is
consistent, optional where it varies by version. Every numeric metric is
`number | undefined`, never `0` as a stand-in, because "not recorded" and
"zero" mean different things in a log (the explain parser defaults to `0`
because explain always reports; logs do not).

The Zod schema is deliberately loose at the top (`z.looseObject`) and strict
on the fields we read. Unknown fields ride along in `raw`.

`operation` is a closed union of the query operations the tool understands;
everything else is `command`, and `commandName` keeps the command's own name
(`createIndexes`, `collStats`, ...) so those entries are never opaque.

### 2.3 Query shape

MongoDB provides `queryHash`/`planCacheKey` (4.2+) and
`queryShapeHash`/`planCacheShapeHash` (8.0+), but older logs lack them,
`getMore` entries carry them only via `originatingCommand`, and hashes have no
readable label. So the tool computes a **local shape** and also offers the
server hashes as grouping dimensions when the log records them.

- `predicate` canonicalizes `filter`/`$match`: values become type tokens,
  `$and`/`$or` branches sort, regexes and unknown operators stay exact.
- `expression` canonicalizes `$group`/`$project`/`$set` bodies, preserving
  field references and `$literal` types.
- `pipeline` maps each stage to the right canonicalizer; unknown stages stay
  exact.
- `sort`, `hint`, `min`, `max` preserve key order (`$ordered`).
- Options other than the query itself are kept verbatim.

Rules that matter for grouping correctness:

- **Cursor batches** attribute to their originating command's shape and carry
  `isCursorBatch`, so cumulative time can include or exclude batches (toggle,
  default include). A `getMore` without `originatingCommand` is its own
  singleton group.
- **Truncated commands** (`$truncated`) and **empty commands** are singleton
  groups. Merging them would invent similarity.
- The shape label is `namespace · command summary` (`orders · $match → $group`).

### 2.4 Groups

A `GroupDimension` is `{ id, label, keyOf, detailOf?, recorded? }`. Built-in
dimensions: shape, namespace, command, plan summary (with `3× IXSCAN {…}`
collapsing), comment, app, `queryShapeHash`, client (the remote host).
Shape and plan summary are keyed within a namespace, since a collection scan
on one collection is a different problem from one on another; `detailOf`
supplies the part of the label after the namespace. Dimensions with
`recorded` are offered only when some entry records the field.

`computeStats(entries)` produces: count, cumulative time, share of cumulative
time, avg, p50, p95, max, bytes read, collection-scan count, cursor-batch
count. Examined and returned counts are not summed per group: a sum across
different queries says nothing about any one of them.

Percentiles are computed over entries that recorded a duration. "Sum of known
values" semantics apply everywhere: a group where no entry recorded
`bytesRead` shows "—", not `0`.

---

## 3. Processing pipeline

Mirrors the explain pipeline (input → validate → normalize → analyze → view)
so contributors find the same structure in both tools.

```
text
 └─ splitRecords()          JSONL / array / single                 → unknown[]
     └─ slowQueryRecordSchema   Zod, loose                          → SlowQueryRecord
         └─ normalizeEntry()    EJSON, noise strip, shape, planSummary → SlowQueryEntry
             └─ analyzers       entry / group / workload           → SlowQueryFinding[]
                 └─ view state  search, group filters, sort, selection
```

- Every file under `lib/` is pure and framework-free; components never
  compute shapes, groups, or findings.
- Failures are per record, not per file. `SlowQueryParseError` is thrown only
  when the input is not JSON at all.
- Parsing runs on the main thread up to 5 MB and in a Web Worker above it.
  jsdom has no `Worker`, so tests cover the synchronous path and the worker is
  a thin wrapper around the same function.

---

## 4. Analysis

Reuses the severity and category vocabulary from `#types/analysis.ts` so both
tools render findings the same way, with analyzer layers scoped to logs:

| Layer    | Input                | Analyzers                                                                                                                                                  |
| -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry    | one `SlowQueryEntry` | collection scan; low document efficiency; in-memory sort; disk use; replanned; truncated command; queue wait; write conflicts; planning time; storage read |
| Group    | one group            | dominant time share; high variance (p95 ≫ p50); consistently unindexed                                                                                     |
| Workload | all visible entries  | dominant namespace; collection-scan share; cursor-batch share                                                                                              |

Thresholds live next to the analyzer and match Paste the Plan where the metric
is shared (document efficiency). Findings describe the data, never the UI.

Plan summary parsing links each stage token (`COLLSCAN`, `IXSCAN`, ...) to the
stage catalog, so a click opens the glossary entry.

---

## 5. UI

- Route `/mongodb-slow-query-explorer`; container exported as
  `mongodb-paste-the-plan/slow-query-explorer`.
- **Input** (featured card): textarea, drop zone, upload, and an example log
  served from `public/examples/`.
- **Loaded log** (the same featured card): a status line with name, entry
  count, cumulative time, skipped count and invalid lines, then the
  workload findings (dominant namespace, collection-scan share, cursor-batch
  share), one line each. This is where "where does the time go?" is answered
  before any table.
- **Filter card**, the one place every filter lives. A dropdown per recorded dimension (each
  a searchable checklist with counts computed under every other filter),
  then Thresholds (duration min and max, docs examined, Document
  Efficiency), a UTC time window, and Findings; above them a free-text
  search that supplements the structured filters and the entry count as
  "N of M"; below, every active value as a removable chip.
- **Timeline**: the chart alone, under the current filters. It stacks each bucket's entries by duration,
  longest at the bottom, the smallest merged into one segment past a cap.
  Hovering a segment shows the entry, clicking opens it in the drawer, and
  dragging across buckets sets the time window to them; clicking a merged
  segment zooms to its bucket. The From and Until chips clear the window.
- **Query groups**: Group by pills, the getMore batches toggle, and the
  sortable group table: a checkbox per row, cumulative time as a bar with
  its share of the total, average and max, and finding icons. Clicking a
  row toggles that value in the filter for its dimension, which the
  checkbox shows.
- **Log entries**: sortable, virtualized table. Time, duration, operation
  with namespace, command, plan summary, nreturned, docsExamined, and
  Document Efficiency by default; keysExamined, Index Efficiency, findings,
  and comment behind the column picker.
- **Detail drawer**: plan summary with glossary links, findings, every recorded
  field under its log field name, the logged command as the mongosh call
  that issued it (collection, arguments, and modifiers broken out; raw JSON
  when it has no shell form), and the raw record on a tab. That tab is the only JSON view: it shows what
  MongoDB wrote, never an object this tool assembled. `j`/`k`/arrows step,
  `Esc` closes.

One facet model: within a facet, values are OR; across facets and with
thresholds, time, and search, AND. The filter applies everywhere; grouping by
another dimension with a selection active drills down. Two places set one
facet aside: a dimension's facet counts, which are counted under every other
filter so each count says what selecting it would leave, and the group table
when it is grouped by a dimension with a selection, so its rows stay put and
the selected row reads as selected rather than alone.

No sharing. Logs hold literal values, and view state is not worth a URL.

---

## 6. Testing

Fixtures are real logs generated against a synthetic dataset, under
`src/test-utils/fixtures/slow-query-logs/<version>/<topology>/*.jsonl`, by
the [mongodb-slow-query-log-generator](https://github.com/dfrancour/mongodb-slow-query-log-generator) repo. Fields the local server
cannot emit (8.0 `workingMillis`, `queues`, `queryShapeHash`) come from
documentation examples. The example log the app serves comes from the same
repo: a separate workload (a multi-tenant helpdesk with several services)
run against an 8.x server at its default 100 ms slow threshold, so the file
reads like a production capture and never holds sub-threshold entries.

- **Parsing completeness.** Every fixture record is an entry or a counted
  skip; every entry keeps `raw`.
- **Shape stability.** Same command with different values yields the same
  shape; different operators differ; `$and` order does not matter; `sort`
  order does; regexes are preserved exactly.
- **Attribution.** `getMore` with `originatingCommand` joins its origin's
  group; without it, it is a singleton; truncated commands never merge.
- **Aggregation arithmetic.** Group totals sum to the workload total under
  every dimension; unknown metrics stay unknown; percentiles ignore entries
  without duration.
- **Analyzers.** Each has a fixture case that triggers it and one that does not.
- **Container.** Load, drawer keyboard navigation, search, group filter and
  drill-down, empty input, reload.
