export class PlanParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly errorType?: "invalid" | "parsing",
  ) {
    super(message);
    this.name = "PlanParseError";
  }
}
