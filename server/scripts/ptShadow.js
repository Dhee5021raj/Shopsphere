'use strict';
/**
 * Step 7 — one shadow measurement, run as its OWN process.
 *
 * The live app's mongoose default connection points at the demo DB, while the
 * benchmark lives in `shopsphere_bench`. Rather than juggle two connections in
 * the request process, the shadow middleware spawns this script detached; it
 * opens its own bench connection, runs naive vs reduced on the spec's default
 * join order, and appends a `kind: 'shadow'` record to the JSONL log.
 *
 * Usage: node scripts/ptShadow.js --spec=<name> [--runs=N] [--trigger=/api/...]
 *
 * This script never touches the demo DB and never runs unless PT_SHADOW=1
 * (enforced by the caller).
 */
const fs = require('fs');
const path = require('path');
const { connectBench, disconnectBench, benchUri } = require('../pt/benchDb');
const { byName } = require('../pt/specs');
const { runNaive, runReduced, resultsEqual, checksum, fullCollectionOf } = require('../pt/execute');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = process.env.PT_LOG || path.join(LOG_DIR, 'pt-log.jsonl');
// Single-flight lock shared with middleware/ptShadow.js: removed when this run
// finishes so the next trigger can fire.
const LOCK_FILE = path.join(LOG_DIR, '.pt-shadow.lock');

function arg(name, dflt) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
}

async function timeIt(fn) {
  const t0 = Date.now();
  const r = await fn();
  return { r, ms: Date.now() - t0 };
}

async function main() {
  const specName = arg('spec', null);
  const trigger = arg('trigger', null);
  const runs = Math.max(1, Number(arg('runs', process.env.PT_SHADOW_RUNS || 2)));
  if (!specName || !byName[specName]) {
    console.error(`[pt-shadow] unknown or missing spec '${specName}'`);
    process.exit(1);
  }
  const spec = byName[specName];
  // Naive/reduced join order. Defaults to the spec's declared relation order,
  // but the caller may pin an order (e.g. a bad one) so the reduction win is
  // visible in the live app.
  const orderArg = arg('order', null);
  const order = orderArg ? orderArg.split('>').map((s) => s.trim()).filter(Boolean) : spec.relations.map((r) => r.alias);

  fs.mkdirSync(LOG_DIR, { recursive: true });
  await connectBench();
  try {
    const now = new Date();
    // warm-up
    const warm = await runNaive(spec, order, { now });
    const naiveTimes = [];
    let naiveResult = warm.result;
    for (let i = 0; i < runs; i++) {
      const { r, ms } = await timeIt(() => runNaive(spec, order, { now }));
      naiveTimes.push(ms);
      naiveResult = r.result;
    }

    const red = await runReduced(spec, order, { now });
    const reducedTimes = [];
    let reducedResult = red.result;
    for (let i = 0; i < runs; i++) {
      const { r, ms } = await timeIt(() => runReduced(spec, order, { now }));
      reducedTimes.push(ms);
      reducedResult = r.result;
    }

    const med = (xs) => {
      const s = xs.slice().sort((a, b) => a - b);
      return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    };
    const naiveMs = med(naiveTimes);
    const reducedMs = med(reducedTimes);
    const transferMs = red.transferMs;
    const matMs = red.materializationMs;
    // `reducedMs` is the wall-clock of a full reduced run and therefore already
    // includes transfer + materialization; do NOT add them again.
    const totalMs = reducedMs;
    const overheadPct = totalMs > 0 ? +(((transferMs + matMs) / totalMs) * 100).toFixed(1) : null;
    const eq = resultsEqual(naiveResult, reducedResult);

    const rec = {
      ts: new Date().toISOString(),
      kind: 'shadow',
      trigger,
      spec: specName,
      order: order.join('>'),
      runs,
      naive_ms: +naiveMs.toFixed(1),
      reduced_ms: +reducedMs.toFixed(1),
      transfer_ms: transferMs,
      materialization_ms: matMs,
      total_ms: +totalMs.toFixed(1),
      speedup: totalMs > 0 ? +(naiveMs / totalMs).toFixed(2) : null,
      transfer_overhead_pct: overheadPct,
      equal: eq.equal,
      mismatch: eq.equal ? null : eq.reason,
      result_rows: eq.rows != null ? eq.rows : null,
      checksum: checksum(naiveResult || []),
      db: benchUri()
    };
    fs.appendFileSync(LOG_FILE, JSON.stringify(rec) + '\n');
    console.log(`[pt-shadow] ${specName} naive=${naiveMs}ms reduced=${totalMs}ms speedup=${rec.speedup} equal=${eq.equal}`);
  } finally {
    await disconnectBench();
    try { fs.unlinkSync(LOCK_FILE); } catch (_) { /* lock already gone */ }
  }
}

main().catch((e) => { console.error('[pt-shadow] FAILED:', e.message); process.exit(1); });
