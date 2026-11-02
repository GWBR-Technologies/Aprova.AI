type LogFn = (fields: Record<string, unknown>, msg: string) => void;

/** Subconjunto do pino usado fora de infrastructure; nunca recebe texto de redação nem tokens. */
export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}
