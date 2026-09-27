/** Thrown when input text cannot be read as any supported log format. */
export class SlowQueryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlowQueryParseError";
  }
}
