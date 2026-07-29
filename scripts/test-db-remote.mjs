import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const DEFAULT_TEST_PATH = 'supabase/tests';

async function collectTestFiles(inputPaths) {
  const files = [];

  async function visit(inputPath) {
    const absolutePath = resolve(inputPath);
    const fileStat = await stat(absolutePath);

    if (fileStat.isDirectory()) {
      const entries = await readdir(absolutePath, { withFileTypes: true });
      for (const entry of entries) {
        await visit(join(absolutePath, entry.name));
      }
      return;
    }

    if (absolutePath.endsWith('.test.sql')) files.push(absolutePath);
  }

  for (const inputPath of inputPaths) await visit(inputPath);
  return files.sort();
}

function buildRemoteTestSql(source, filePath) {
  const planMatch = source.match(/SELECT\s+extensions\.plan\((\d+)\);/i);
  if (!planMatch) throw new Error(`${basename(filePath)} does not declare a pgTAP plan.`);

  const expectedTests = Number(planMatch[1]);
  const tableSetup = [
    'BEGIN;',
    '',
    'CREATE TEMP TABLE pg_temp._codex_tap_results (result TEXT NOT NULL);',
    'GRANT SELECT, INSERT ON pg_temp._codex_tap_results TO anon, authenticated, service_role;',
  ].join('\n');

  let transformed = source.replace(/^BEGIN;/m, tableSetup);
  transformed = transformed.replace(
    /^SELECT\s+extensions\./gm,
    'INSERT INTO pg_temp._codex_tap_results(result) SELECT extensions.'
  );
  transformed = transformed.replace(
    /^SELECT\s+\*\s+FROM\s+extensions\.finish\(\);/gm,
    [
      'INSERT INTO pg_temp._codex_tap_results(result) SELECT * FROM extensions.finish();',
      '',
      'SELECT result FROM pg_temp._codex_tap_results ORDER BY ctid;',
    ].join('\n')
  );

  if (!transformed.includes('SELECT result FROM pg_temp._codex_tap_results')) {
    throw new Error(`${basename(filePath)} does not call extensions.finish().`);
  }

  return { sql: transformed, expectedTests };
}

function extractJsonObject(output) {
  for (let start = output.indexOf('{'); start >= 0; start = output.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < output.length; index += 1) {
      const character = output[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }

      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          const candidate = output.slice(start, index + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error('Supabase CLI did not return a JSON query result.');
}

function runSupabaseQuery(filePath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      'supabase',
      ['db', 'query', '--linked', '--file', filePath, '--output-format', 'json'],
      { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', rejectPromise);
    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        rejectPromise(new Error([stdout, stderr].filter(Boolean).join('\n').trim()));
        return;
      }

      try {
        resolvePromise(extractJsonObject(`${stdout}\n${stderr}`));
      } catch (error) {
        rejectPromise(error);
      }
    });
  });
}

function assertTapResults(payload, expectedTests, filePath) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const results = rows.map((row) => String(row?.result ?? ''));
  const plan = results.find((line) => /^1\.\.\d+$/.test(line));
  const passed = results.filter((line) => /^ok\s+\d+\b/.test(line));
  const failures = results.filter((line) => /^not ok\s+\d+\b/.test(line));
  const unexpected = results.filter(
    (line) => line && !/^1\.\.\d+$/.test(line) && !/^(?:not )?ok\s+\d+\b/.test(line)
  );

  if (plan !== `1..${expectedTests}` || passed.length !== expectedTests || failures.length || unexpected.length) {
    const details = [...failures, ...unexpected].join('\n') || results.join('\n');
    throw new Error(`${basename(filePath)} failed:\n${details}`);
  }

  return passed.length;
}

async function main() {
  const inputPaths = process.argv.slice(2);
  const testFiles = await collectTestFiles(inputPaths.length ? inputPaths : [DEFAULT_TEST_PATH]);
  if (!testFiles.length) throw new Error('No .test.sql files found.');

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'peloteras-db-tests-'));
  let totalPassed = 0;

  try {
    for (const [index, testFile] of testFiles.entries()) {
      const source = await readFile(testFile, 'utf8');
      const { sql, expectedTests } = buildRemoteTestSql(source, testFile);
      const temporaryFile = join(temporaryDirectory, `${index}-${basename(testFile)}`);
      await writeFile(temporaryFile, sql, { mode: 0o600 });
      const payload = await runSupabaseQuery(temporaryFile);
      const passed = assertTapResults(payload, expectedTests, testFile);
      totalPassed += passed;
      console.log(`✓ ${basename(testFile)} (${passed}/${expectedTests})`);
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }

  console.log(`\n${totalPassed} database assertions passed on the linked Supabase project.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
