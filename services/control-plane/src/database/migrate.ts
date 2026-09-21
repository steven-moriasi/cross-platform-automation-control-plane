import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool, type PoolClient } from "pg";

import { readEnvironment } from "../config/environment.js";

interface AppliedMigration {
  readonly checksum: string;
  readonly version: string;
}

const migrationFilePattern = /^\d{3}_[a-z0-9_]+\.sql$/;
const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

async function prepareMigrationTable(client: PoolClient): Promise<void> {
  await client.query("create schema if not exists control_plane");
  await client.query(`
    create table if not exists control_plane.schema_migrations (
      version text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function loadAppliedMigrations(
  client: PoolClient,
): Promise<ReadonlyMap<string, string>> {
  const result = await client.query<AppliedMigration>(
    "select version, checksum from control_plane.schema_migrations order by version",
  );
  return new Map(
    result.rows.map(({ checksum, version }) => [version, checksum]),
  );
}

function checksum(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

async function run(): Promise<void> {
  const environment = readEnvironment(process.env);
  const pool = new Pool({
    application_name: "automation-control-plane-migrator",
    connectionString: environment.databaseUrl,
    max: 1,
  });
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [8_192_403]);
    await prepareMigrationTable(client);

    const applied = await loadAppliedMigrations(client);
    const filenames = (await readdir(migrationsDirectory))
      .filter((filename) => migrationFilePattern.test(filename))
      .sort();

    for (const filename of filenames) {
      const contents = await readFile(
        join(migrationsDirectory, filename),
        "utf8",
      );
      const migrationChecksum = checksum(contents);
      const appliedChecksum = applied.get(filename);

      if (appliedChecksum !== undefined) {
        if (appliedChecksum !== migrationChecksum) {
          throw new Error(`Applied migration ${filename} has been modified`);
        }
        continue;
      }

      await client.query("begin");
      try {
        await client.query(contents);
        await client.query(
          "insert into control_plane.schema_migrations (version, checksum) values ($1, $2)",
          [filename, migrationChecksum],
        );
        await client.query("commit");
      } catch (error: unknown) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [8_192_403]);
    client.release();
    await pool.end();
  }
}

await run();
