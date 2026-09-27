import exampleLines from "./example.json";

/** The example slow-query log as JSONL text, one array element per line. */
export const exampleSlowQueryLog: string = exampleLines.join("\n") + "\n";
