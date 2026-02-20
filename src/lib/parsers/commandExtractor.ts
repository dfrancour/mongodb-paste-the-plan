import type { ExplainPlan } from "#types/explain-plan";
import { hasArrayProperty, hasStringProperty } from "#lib/utils/jsxUtils";
import { getCursorContentFromPlan } from "./cursorExtractor";

export interface QueryInfo {
  readonly namespace: string;
  readonly collection: string;
  readonly database: string;
  readonly operation: "find" | "aggregate" | "unknown";
  readonly query: unknown;
  readonly aggregationPipeline?: readonly unknown[];
  readonly sort?: unknown;
  readonly limit?: number;
  readonly skip?: number;
  readonly projection?: unknown;
  // Additional command options
  readonly hint?: unknown;
  readonly maxTimeMS?: number;
  readonly collation?: unknown;
  readonly comment?: string;
  readonly batchSize?: number;
  readonly allowDiskUse?: boolean;
  readonly readConcern?: unknown;
  readonly readPreference?: unknown;
}

/**
 * Extracts command information from MongoDB explain plans
 *
 * Focuses on the command node to show what the user actually executed,
 * rather than reverse-engineering from query planner internals.
 */
export class CommandExtractor {
  /**
   * Extract command information from an explain plan
   */
  static extractQuery(plan: ExplainPlan): QueryInfo {
    // Try to extract from command node first (most accurate)
    const commandInfo = this.extractFromCommand(plan);
    if (commandInfo) {
      const { database, collection } = this.extractDatabaseAndCollection(plan);
      const namespace = `${database}.${collection}`;
      return {
        namespace,
        database,
        collection,
        ...commandInfo,
      };
    }

    // Fallback for older explain plan formats without command node
    const namespace = this.extractNamespace(plan);
    const [database, collection] = this.parseNamespace(namespace);
    return this.extractLegacy(plan, namespace, database, collection);
  }

  /**
   * Extract command information from command node
   */
  private static extractFromCommand(
    plan: ExplainPlan,
  ): Omit<QueryInfo, "namespace" | "database" | "collection"> | null {
    // Check for cursor-wrapped command first (aggregation with cursor stage)
    const cursor = this.extractCursorData(plan);
    const command = cursor?.command ?? plan.command;

    if (!command) {
      return null;
    }

    // Handle aggregation command
    if (hasArrayProperty(command, "pipeline")) {
      const commandObj = command as Record<string, unknown>;
      return {
        operation: "aggregate",
        query: {},
        aggregationPipeline: command.pipeline,
        // Extract additional command options
        hint: commandObj.hint,
        maxTimeMS:
          typeof commandObj.maxTimeMS === "number"
            ? commandObj.maxTimeMS
            : undefined,
        collation: commandObj.collation,
        comment:
          typeof commandObj.comment === "string"
            ? commandObj.comment
            : undefined,
        batchSize:
          typeof commandObj.batchSize === "number"
            ? commandObj.batchSize
            : undefined,
        allowDiskUse:
          typeof commandObj.allowDiskUse === "boolean"
            ? commandObj.allowDiskUse
            : undefined,
        readConcern: commandObj.readConcern,
        readPreference: commandObj.readPreference,
      };
    }

    // Handle find command
    if (hasStringProperty(command, "find")) {
      const commandObj = command as Record<string, unknown>;
      return {
        operation: "find",
        query: commandObj.filter ?? {},
        sort: commandObj.sort,
        limit:
          typeof commandObj.limit === "number" ? commandObj.limit : undefined,
        skip: typeof commandObj.skip === "number" ? commandObj.skip : undefined,
        projection: commandObj.projection,
        // Extract additional command options
        hint: commandObj.hint,
        maxTimeMS:
          typeof commandObj.maxTimeMS === "number"
            ? commandObj.maxTimeMS
            : undefined,
        collation: commandObj.collation,
        comment:
          typeof commandObj.comment === "string"
            ? commandObj.comment
            : undefined,
        batchSize:
          typeof commandObj.batchSize === "number"
            ? commandObj.batchSize
            : undefined,
        allowDiskUse:
          typeof commandObj.allowDiskUse === "boolean"
            ? commandObj.allowDiskUse
            : undefined,
        readConcern: commandObj.readConcern,
        readPreference: commandObj.readPreference,
      };
    }

    return null;
  }

  /**
   * Extract cursor data from cursor-wrapped plans, or null if not wrapped.
   * Supports $cursor, $geoNearCursor, and other cursor-type stages via
   * structure-based detection (checks for queryPlanner/executionStats content).
   */
  private static extractCursorData(
    plan: ExplainPlan,
  ): Record<string, unknown> | null {
    const cursorContent = getCursorContentFromPlan(plan);
    return cursorContent as Record<string, unknown> | null;
  }

  /**
   * Legacy extraction for older explain plan formats without command node
   */
  private static extractLegacy(
    plan: ExplainPlan,
    namespace: string,
    database: string,
    collection: string,
  ): QueryInfo {
    // Check if this is a true aggregation pipeline (not wrapped in a cursor stage)
    if (hasArrayProperty(plan, "stages") && !this.extractCursorData(plan)) {
      return {
        namespace,
        database: database ?? "unknown",
        collection: collection ?? "unknown",
        operation: "aggregate",
        query: {},
        aggregationPipeline: plan.stages,
      };
    }

    // Regular find query (including cursor-wrapped find operations)
    const query = this.extractFindQuery(plan);
    const sort = this.extractSort(plan);
    const limit = this.extractLimit(plan);
    const skip = this.extractSkip(plan);
    const projection = this.extractProjection(plan);

    return {
      namespace,
      database: database ?? "unknown",
      collection: collection ?? "unknown",
      operation: "find",
      query,
      sort,
      limit,
      skip,
      projection,
    };
  }

  /**
   * Extract database and collection from command node
   */
  private static extractDatabaseAndCollection(plan: ExplainPlan): {
    database: string;
    collection: string;
  } {
    // Check command first (most accurate)
    if (
      plan.command &&
      typeof plan.command === "object" &&
      plan.command !== null
    ) {
      const cmd = plan.command;
      const database = typeof cmd.$db === "string" ? cmd.$db : undefined;
      const findCollection =
        typeof cmd.find === "string" ? cmd.find : undefined;
      const aggregateCollection =
        typeof cmd.aggregate === "string" ? cmd.aggregate : undefined;
      const collection = findCollection ?? aggregateCollection;
      if (collection) {
        return { database: database ?? "unknown", collection };
      }
    }

    // Check for cursor-wrapped command (supports $cursor, $geoNearCursor, etc.)
    const cursor = this.extractCursorData(plan);
    if (
      cursor &&
      typeof cursor.command === "object" &&
      cursor.command !== null
    ) {
      const cmd = cursor.command as Record<string, unknown>;
      const database = typeof cmd.$db === "string" ? cmd.$db : undefined;
      const findCollection =
        typeof cmd.find === "string" ? cmd.find : undefined;
      const aggregateCollection =
        typeof cmd.aggregate === "string" ? cmd.aggregate : undefined;
      const collection = findCollection ?? aggregateCollection;
      if (collection) {
        return { database: database ?? "unknown", collection };
      }
    }

    // For sharded plans, try to extract from shards namespace
    if (
      plan.shards &&
      typeof plan.shards === "object" &&
      plan.shards !== null
    ) {
      // Modern sharded aggregation format
      const shardNames = Object.keys(plan.shards);
      if (shardNames.length > 0 && shardNames[0]) {
        const firstShard = (plan.shards as Record<string, unknown>)[
          shardNames[0]
        ] as Record<string, unknown>;
        if (
          firstShard &&
          typeof firstShard === "object" &&
          typeof firstShard.queryPlanner === "object" &&
          firstShard.queryPlanner !== null &&
          "namespace" in firstShard.queryPlanner
        ) {
          const ns = (firstShard.queryPlanner as Record<string, unknown>)
            .namespace;
          if (typeof ns === "string") {
            const [database, collection] = this.parseNamespace(ns);
            return { database, collection };
          }
        }
      }
    }

    return { database: "unknown", collection: "unknown" };
  }

  /**
   * Extract namespace from explain plan (legacy fallback)
   */
  private static extractNamespace(plan: ExplainPlan): string {
    // Check for sharded plans first - namespace is in individual shards
    if (
      plan.shards &&
      typeof plan.shards === "object" &&
      plan.shards !== null
    ) {
      // Modern sharded aggregation format
      const shardNames = Object.keys(plan.shards);
      if (shardNames.length > 0 && shardNames[0]) {
        const firstShard = (plan.shards as Record<string, unknown>)[
          shardNames[0]
        ] as Record<string, unknown>;
        if (
          firstShard &&
          typeof firstShard === "object" &&
          typeof firstShard.queryPlanner === "object" &&
          firstShard.queryPlanner !== null &&
          "namespace" in firstShard.queryPlanner
        ) {
          const ns = (firstShard.queryPlanner as Record<string, unknown>)
            .namespace;
          if (typeof ns === "string") return ns;
        }
      }
    }

    // Check for sharded find queries - namespace is in shards array
    if (
      plan.queryPlanner &&
      typeof plan.queryPlanner === "object" &&
      typeof plan.queryPlanner.winningPlan === "object" &&
      plan.queryPlanner.winningPlan !== null &&
      "shards" in plan.queryPlanner.winningPlan
    ) {
      const shards = (plan.queryPlanner.winningPlan as Record<string, unknown>)
        .shards;
      if (Array.isArray(shards) && shards.length > 0) {
        const firstShard = shards[0] as Record<string, unknown>;
        if (
          firstShard &&
          typeof firstShard === "object" &&
          typeof firstShard.winningPlan === "object" &&
          firstShard.winningPlan !== null &&
          "namespace" in firstShard
        ) {
          const ns = firstShard.namespace;
          if (typeof ns === "string") return ns;
        }
      }
    }

    // Check for cursor-wrapped namespace (supports $cursor, $geoNearCursor, etc.)
    const cursor = this.extractCursorData(plan);
    if (
      cursor &&
      typeof cursor.queryPlanner === "object" &&
      cursor.queryPlanner !== null &&
      "namespace" in cursor.queryPlanner
    ) {
      const ns = (cursor.queryPlanner as Record<string, unknown>).namespace;
      if (typeof ns === "string") return ns;
    }

    if (
      plan.queryPlanner &&
      typeof plan.queryPlanner === "object" &&
      "namespace" in plan.queryPlanner
    ) {
      const ns = (plan.queryPlanner as Record<string, unknown>).namespace;
      if (typeof ns === "string") return ns;
    }

    // Fallback to executionStats if available
    if (
      plan.executionStats &&
      hasStringProperty(plan.executionStats, "namespace")
    ) {
      return plan.executionStats.namespace;
    }

    return "unknown.unknown";
  }

  /**
   * Parse namespace into database and collection parts
   * Handles complex namespaces with multiple dots by treating the last segment as collection
   */
  private static parseNamespace(namespace: string): [string, string] {
    if (namespace === "unknown.unknown") {
      return ["unknown", "unknown"];
    }

    const lastDotIndex = namespace.lastIndexOf(".");
    if (lastDotIndex === -1) {
      // No dot found, treat entire string as collection with unknown database
      return ["unknown", namespace];
    }

    const database = namespace.substring(0, lastDotIndex);
    const collection = namespace.substring(lastDotIndex + 1);

    return [database, collection];
  }

  // Legacy extraction methods (kept for fallback compatibility)
  private static extractFindQuery(plan: ExplainPlan): unknown {
    const cursor = this.extractCursorData(plan);
    if (
      cursor &&
      typeof cursor.queryPlanner === "object" &&
      cursor.queryPlanner !== null &&
      "parsedQuery" in cursor.queryPlanner
    ) {
      const pq = (cursor.queryPlanner as Record<string, unknown>).parsedQuery;
      if (typeof pq === "object" && pq !== null) return pq;
    }

    if (
      plan.queryPlanner &&
      typeof plan.queryPlanner === "object" &&
      "parsedQuery" in plan.queryPlanner
    ) {
      const pq = (plan.queryPlanner as Record<string, unknown>).parsedQuery;
      if (typeof pq === "object" && pq !== null) return pq;
    }

    return {};
  }

  private static extractSort(plan: ExplainPlan): unknown {
    const cursor = this.extractCursorData(plan);
    if (
      cursor &&
      typeof cursor.command === "object" &&
      cursor.command !== null &&
      "sort" in cursor.command
    ) {
      const sort = (cursor.command as Record<string, unknown>).sort;
      if (typeof sort === "object" && sort !== null) return sort;
    }

    if (
      plan.command &&
      typeof plan.command === "object" &&
      "sort" in plan.command
    ) {
      const sort = plan.command.sort;
      if (typeof sort === "object" && sort !== null) return sort;
    }

    return undefined;
  }

  private static extractLimit(plan: ExplainPlan): number | undefined {
    if (
      plan.queryPlanner &&
      typeof plan.queryPlanner === "object" &&
      "winningPlan" in plan.queryPlanner
    ) {
      const wp = (plan.queryPlanner as Record<string, unknown>).winningPlan;
      if (wp && typeof wp === "object" && "limit" in wp) {
        const limit = (wp as Record<string, unknown>).limit;
        if (typeof limit === "number") return limit;
      }
    }
    return undefined;
  }

  private static extractSkip(plan: ExplainPlan): number | undefined {
    if (
      plan.queryPlanner?.winningPlan?.skip &&
      typeof plan.queryPlanner.winningPlan.skip === "number"
    ) {
      return plan.queryPlanner.winningPlan.skip;
    }

    return undefined;
  }

  private static extractProjection(plan: ExplainPlan): unknown {
    const cursor = this.extractCursorData(plan);
    if (
      cursor &&
      typeof cursor.queryPlanner === "object" &&
      cursor.queryPlanner !== null &&
      "winningPlan" in cursor.queryPlanner
    ) {
      const winningPlan = (cursor.queryPlanner as Record<string, unknown>)
        .winningPlan;
      if (winningPlan && typeof winningPlan === "object") {
        if (
          "transformBy" in winningPlan &&
          (winningPlan as Record<string, unknown>).transformBy
        ) {
          return (winningPlan as Record<string, unknown>).transformBy;
        }
        if (
          "queryPlan" in winningPlan &&
          (winningPlan as Record<string, unknown>).queryPlan &&
          typeof (winningPlan as Record<string, unknown>).queryPlan === "object"
        ) {
          const qp = (winningPlan as Record<string, unknown>)
            .queryPlan as Record<string, unknown>;
          if ("transformBy" in qp) {
            return qp.transformBy;
          }
        }
      }
    }

    if (
      plan.queryPlanner &&
      typeof plan.queryPlanner === "object" &&
      "winningPlan" in plan.queryPlanner
    ) {
      const winningPlan = (plan.queryPlanner as Record<string, unknown>)
        .winningPlan;
      if (
        winningPlan &&
        typeof winningPlan === "object" &&
        "projection" in winningPlan
      ) {
        return (winningPlan as Record<string, unknown>).projection;
      }
    }

    return undefined;
  }

  /**
   * Extract individual pipeline stages from aggregation pipeline
   */
  static extractPipelineStages(queryInfo: QueryInfo): readonly unknown[] {
    if (queryInfo.operation === "aggregate" && queryInfo.aggregationPipeline) {
      return queryInfo.aggregationPipeline;
    }
    return [];
  }

  /**
   * Format command information as a MongoDB command string
   */
  static formatAsCommand(
    queryInfo: QueryInfo,
    explainMode?: "queryPlanner" | "executionStats" | "allPlansExecution",
  ): string {
    const { database, collection, operation } = queryInfo;
    const useStatement =
      database && database !== "unknown" ? `use ${database}\n` : "";

    if (operation === "aggregate") {
      const pipeline = JSON.stringify(queryInfo.aggregationPipeline, null, 2);
      const indentedPipeline = this.indentLines(pipeline, 2);
      let command = `db.${collection}.aggregate(\n  // pipeline\n${indentedPipeline}\n`;

      // Add aggregation options if present
      const options: string[] = [];
      if (queryInfo.hint !== undefined) {
        options.push(
          `hint: ${typeof queryInfo.hint === "string" ? `"${queryInfo.hint}"` : JSON.stringify(queryInfo.hint)}`,
        );
      }
      if (queryInfo.maxTimeMS !== undefined) {
        options.push(`maxTimeMS: ${queryInfo.maxTimeMS}`);
      }
      if (queryInfo.collation !== undefined) {
        options.push(`collation: ${JSON.stringify(queryInfo.collation)}`);
      }
      if (queryInfo.comment !== undefined) {
        options.push(`comment: "${queryInfo.comment}"`);
      }
      if (queryInfo.batchSize !== undefined) {
        options.push(`batchSize: ${queryInfo.batchSize}`);
      }
      if (queryInfo.allowDiskUse !== undefined) {
        options.push(`allowDiskUse: ${queryInfo.allowDiskUse}`);
      }
      if (queryInfo.readConcern !== undefined) {
        options.push(`readConcern: ${JSON.stringify(queryInfo.readConcern)}`);
      }
      if (queryInfo.readPreference !== undefined) {
        options.push(
          `readPreference: ${JSON.stringify(queryInfo.readPreference)}`,
        );
      }

      if (options.length > 0) {
        command += `,\n  // options\n  {\n    ${options.join(",\n    ")}\n  }\n)`;
      } else {
        command += ")";
      }

      // Append .explain() if explainMode is provided
      if (explainMode) {
        command += `.explain("${explainMode}")`;
      }

      return useStatement + command;
    }

    // Find query - format with proper indentation for readability
    const parts: string[] = [];

    // Query filter
    const filterComment = "  // filter";
    if (queryInfo.query && Object.keys(queryInfo.query as object).length > 0) {
      parts.push(
        `${filterComment}\n${this.indentLines(JSON.stringify(queryInfo.query, null, 2), 2)}`,
      );
    } else {
      parts.push(`${filterComment}\n  {}`);
    }

    // Projection
    if (queryInfo.projection) {
      const projectionComment = "  // projection";
      parts.push(
        `${projectionComment}\n${this.indentLines(JSON.stringify(queryInfo.projection, null, 2), 2)}`,
      );
    }

    let command = `db.${collection}.find(\n${parts.join(",\n")}\n)`;

    // Sort
    if (queryInfo.sort) {
      command += `.sort(${JSON.stringify(queryInfo.sort)})`;
    }

    // Limit
    if (queryInfo.limit) {
      command += `.limit(${queryInfo.limit})`;
    }

    // Skip
    if (queryInfo.skip) {
      command += `.skip(${queryInfo.skip})`;
    }

    // Additional command options
    if (queryInfo.hint !== undefined) {
      command += `.hint(${typeof queryInfo.hint === "string" ? `"${queryInfo.hint}"` : JSON.stringify(queryInfo.hint)})`;
    }
    if (queryInfo.maxTimeMS !== undefined) {
      command += `.maxTimeMS(${queryInfo.maxTimeMS})`;
    }
    if (queryInfo.collation !== undefined) {
      command += `.collation(${JSON.stringify(queryInfo.collation)})`;
    }
    if (queryInfo.comment !== undefined) {
      command += `.comment("${queryInfo.comment}")`;
    }
    if (queryInfo.batchSize !== undefined) {
      command += `.batchSize(${queryInfo.batchSize})`;
    }
    if (queryInfo.readConcern !== undefined) {
      command += `.readConcern(${JSON.stringify(queryInfo.readConcern)})`;
    }
    if (queryInfo.readPreference !== undefined) {
      command += `.readPreference(${JSON.stringify(queryInfo.readPreference)})`;
    }

    // Append .explain() if explainMode is provided
    if (explainMode) {
      command += `.explain("${explainMode}")`;
    }

    return useStatement + command;
  }

  /**
   * Indent each line of a string by the specified number of spaces
   */
  private static indentLines(text: string, spaces: number): string {
    const indent = " ".repeat(spaces);
    return text
      .split("\n")
      .map((line) => indent + line)
      .join("\n");
  }
}
