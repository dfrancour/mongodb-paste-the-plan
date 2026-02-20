import { Braces } from "lucide-react";
import type { QueryCondition } from "#types/explain-plan";
import { Icon } from "#components/common/Icon";

interface QueryConditionsProps {
  readonly conditions: QueryCondition[];
  readonly className?: string;
}

/**
 * Component for displaying query conditions categorized by ESR type
 *
 * Shows all operations from the query (equality, sort, range) regardless of
 * whether an index is used. This helps users understand how their query
 * conditions map to ESR categories.
 */
export function QueryConditions({
  conditions,
  className = "",
}: QueryConditionsProps) {
  const equalityConditions = conditions.filter((c) => c.type === "equality");
  const sortConditions = conditions.filter((c) => c.type === "sort");
  const rangeConditions = conditions.filter((c) => c.type === "range");

  return (
    <div className={`container-secondary ${className}`}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <h4 className="header-card flex items-center gap-2">
          <Icon icon={Braces} variant="primary" />
          Query Conditions
        </h4>
        <span className="text-sm font-normal">
          <span className="text-green-700 dark:text-green-300">
            {equalityConditions.length} equality
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">, </span>
          <span className="text-purple-700 dark:text-purple-300">
            {sortConditions.length} sort
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">, </span>
          <span className="text-blue-700 dark:text-blue-300">
            {rangeConditions.length} range
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {" "}
            conditions
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
        <ConditionColumn
          title="Equality"
          count={equalityConditions.length}
          conditions={equalityConditions}
          colorScheme="green"
        />
        <ConditionColumn
          title="Sort"
          count={sortConditions.length}
          conditions={sortConditions}
          colorScheme="purple"
        />
        <ConditionColumn
          title="Range"
          count={rangeConditions.length}
          conditions={rangeConditions}
          colorScheme="blue"
        />
      </div>
    </div>
  );
}

type ColorScheme = "green" | "purple" | "blue";

interface ConditionColumnProps {
  readonly title: string;
  readonly count: number;
  readonly conditions: QueryCondition[];
  readonly colorScheme: ColorScheme;
}

const colorClasses: Record<
  ColorScheme,
  { title: string; bg: string; code: string }
> = {
  green: {
    title: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-900",
    code: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300",
  },
  purple: {
    title: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-900",
    code: "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300",
  },
  blue: {
    title: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900",
    code: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300",
  },
};

function ConditionColumn({
  title,
  count,
  conditions,
  colorScheme,
}: ConditionColumnProps) {
  const colors = colorClasses[colorScheme];

  return (
    <div>
      <div className={`mb-2 font-medium ${colors.title}`}>
        {title} ({count})
      </div>
      {conditions.length > 0 ? (
        <div className="space-y-1">
          {conditions.map((condition, idx) => (
            <div key={idx} className={`rounded p-2 ${colors.bg}`}>
              <span className="text-neutral-900 dark:text-neutral-100">
                {condition.field}{" "}
                <code className={`ml-1 rounded px-1 ${colors.code}`}>
                  {condition.operator}
                </code>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-neutral-500 italic dark:text-neutral-400">
          None
        </div>
      )}
    </div>
  );
}
