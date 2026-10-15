'use strict';
/**
 * Step 7 — one shadow measurement, run as its OWN process.
 *
 * The live app's mongoose default connection points at the demo DB, while the
 * benchmark lives in `shopsphere_bench`. Rather than juggle two connections in
 * the request process, the shadow middleware spawns this script detached; it
 * opens its own bench connection, runs reduced vs naive on the spec's default
 * join order, and appends a `kind: 'shadow'` record to the JSONL log.
 *
 * The REDUCED (fast) side runs FIRST, and progress is written to
 * `.pt-shadow-status.json` after every phase so the live UI can show
 * "reduced finished" separately while the naive side is still running.
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
// Per-phase progress file read by GET /api/admin/pt-status. Removed on exit
// (success OR failure) together with the lock.
const STATUS_FILE = path.join(LOG_DIR, '.pt-shadow-status.json');

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

  // Dynamic description so every log row describes EXACTLY what was timed
  // (which spec + which join order + whether that order was pinned) instead of
  // repeating the spec's static default text.
  const ALIAS_FULL = { u: 'users', o: 'orders', oi: 'order items', p: 'products', v: 'vendors', c: 'categories', cat: 'categories', r: 'reviews' };
  const orderPretty = order.map((a) => ALIAS_FULL[a] || a).join(' ▸ ');
  const orderNote = orderArg
    ? `timed on the PINNED join order ${orderPretty} (a deliberately bad left-deep order that starves the naive side)`
    : `timed on the spec's declared join order ${orderPretty}`;
  const runDescription = `${spec.description} — ${orderNote}.`;

  fs.mkdirSync(LOG_DIR, { recursive: true });

  const runStartedAt = new Date();
  // Live-UI progress. Phases: 'idle' | 'running' | 'done'. The controller also
  // checks `pid` liveness so a crashed child can never keep "MEASUREMENT
  // RUNNING" on screen forever.
  const phaseState = {
    startedAt: runStartedAt.toISOString(),
    updatedAt: runStartedAt.toISOString(),
    naive: { phase: 'idle', startedAt: null, finishedAt: null, ms: null },
    reduced: { phase: 'idle', startedAt: null, finishedAt: null, ms: null }
  };
  const writeStatus = () => {
    try {
      phaseState.updatedAt = new Date().toISOString();
      fs.writeFileSync(STATUS_FILE, JSON.stringify({ pid: process.pid, ...phaseState }));
    } catch (_) { /* status is best-effort */ }
  };
  const beginPhase = (name) => {
    phaseState[name] = { phase: 'running', startedAt: new Date().toISOString(), finishedAt: null, ms: null };
    writeStatus();
  };
  const endPhase = (name, ms) => {
    phaseState[name] = { phase: 'done', startedAt: phaseState[name].startedAt, finishedAt: new Date().toISOString(), ms: Math.round(ms) };
    writeStatus();
  };

  try {
    // NOTE: connectBench() is INSIDE the try so a failed bench connection
    // (e.g. bench mongod offline) still releases the lock and status file.
    // Previously it ran before the try/finally and a connection failure left
    // a stale lock -> UI showed "MEASUREMENT RUNNING" for up to 15 minutes.
    await connectBench();

    // ── REDUCED first ────────────────────────────────────────────
    // The fast side finishes in seconds; the UI shows it as "done" while the
    // naive side keeps grinding.
    beginPhase('reduced');
    const red = await runReduced(spec, order, { now: runStartedAt });
    const reducedTimes = [];
    // Transfer/materialization are collected from the SAME timed runs the total
    // comes from — taking them from the warm-up pass produced nonsense like
    // "186% overhead" (cold-cache warm-up transfer heavier than a warm timed run).
    const transferTimes = [];
    const matTimes = [];
    let reducedResult = red.result;
    for (let i = 0; i < runs; i++) {
      const { r, ms } = await timeIt(() => runReduced(spec, order, { now: runStartedAt }));
      reducedTimes.push(ms);
      transferTimes.push(r.transferMs);
      matTimes.push(r.materializationMs);
      reducedResult = r.result;
    }
    endPhase('reduced', med(reducedTimes));

    // ── NAIVE second ─────────────────────────────────────────────
    beginPhase('naive');
    await runNaive(spec, order, { now: runStartedAt }); // warm-up
    const naiveTimes = [];
    let naiveResult;
    for (let i = 0; i < runs; i++) {
      const { r, ms } = await timeIt(() => runNaive(spec, order, { now: runStartedAt }));
      naiveTimes.push(ms);
      naiveResult = r.result;
    }
    endPhase('naive', med(naiveTimes));

    const naiveMs = med(naiveTimes);
    const reducedMs = med(reducedTimes);
    const transferMs = med(transferTimes);
    const matMs = med(matTimes);
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
      description: runDescription,
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
    // Release the single-flight lock LAST and unconditionally — if disconnectBench
    // throws, the lock must still be removed or every future trigger gets skipped.
    try { await disconnectBench(); } catch (e) { console.error('[pt-shadow] disconnect:', e.message); }
    try { fs.unlinkSync(LOCK_FILE); } catch (_) { /* lock already gone */ }
    try { fs.unlinkSync(STATUS_FILE); } catch (_) { /* status already gone */ }
  }
}

function med(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

main().catch((e) => { console.error('[pt-shadow] FAILED:', e.message); process.exit(1); });
