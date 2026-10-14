/**
 * Username normalization (docs/05-DATABASE-SCHEMA.md, docs/10-TESTING-PLAN.md).
 *
 * Usernames are stored lowercase + trimmed so uniqueness is
 * case-insensitive at the application layer. The database column
 * carries a UNIQUE constraint on the already-normalized value.
 */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}
