/** Reads COGNIFY_<name>, falling back to the pre-rename SKILLFORGE_<name> so older .env files keep working. */
export function appEnv(name: "FIXTURE_MODE" | "DATA_DIR" | "INSECURE_COOKIE"): string | undefined {
  return process.env[`COGNIFY_${name}`] || process.env[`SKILLFORGE_${name}`] || undefined;
}
