'use strict';
/**
 * Step 4 — join-order robustness experiment.
 *
 * For each spec: enumerate valid join orders (connected prefixes). If more than
 * --maxOrders, take a seeded sample plus the best and worst by naive. For each
 * order run naive and reduced (1 warm-up + --runs timed, alternating which mode
 * goes first), verify the reduced result equals the naive result, and record
 * min/median/max and the max/min robustness gap.
 *
 * Exact mode is swept over --caps (which transfer edges get skipped at each
 * cap). Bloom mode is included as a column when enabled.
 *
 * Every measurement goes to server/logs/pt-log.jsonl (one JSON object/line).
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectBench, disconnectBench, benchUri } = require('../pt/benchDb');
const { specs, byName } = require('../pt/specs');
const { validJoinOrders, runNaive, prepareReduced, joinReduced, cleanupReduced, resultsEqual, checksum } = require('../pt/execute');
const { computeSizes } = require('../pt/transfer');
const { collectEnvInfo } = require('../pt/envInfo');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = process.env.PT_LOG || path.join(LOG_DIR, 'pt-log.jsonl');

function parseArgs(argv) {
  const o = {
    specs: null, maxOrders: 24, runs: 5, caps: [10000, 50000, 200000],
    timeoutMs: 15000, bloom: process.env.PT_BLOOM === '1', seed: 12345,
    scaleLabel: process.env.PT_SCALE || 'custom', append: false, bestworstMax: 12,
    specBudgetMs: 180000
  };
  for (const a of argv.slice(2)) {
    if (a === '--bloom') o.bloom = true;
    else if (a === '--append') o.append = true;
    else { const m = /^--([A-Za-z]+)=(.+)$/.exec(a); if (!m) continue;
      const [, k, v] = m;
      if (k === 'specs') o.specs = v.split(',');
      else if (k === 'caps') o.caps = v.split(',').map(Number);
      else if (k in o) o[k] = Number.isNaN(Number(v)) ? v : Number(v);
    }
  }
  return o;
}

function median(a) { const s = a.slice().sort((x, y) => x - y); const n = s.length; if (!n) return null; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
function seededSample(arr, n, seed) {
  if (arr.length <= n) return arr.slice();
  const a = arr.slice(); let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

async function measure(fn, runs) {
  const times = [];
  let result = null, timeout = false, err = null;
  for (let i = 0; i <= runs; i++) {
    const t0 = Date.now();
    try {
      const r = await fn();
      const ms = r && r.ms != null ? r.ms : (Date.now() - t0);
      if (i === 0) result = r && r.result !== undefined ? r.result : r;
      else times.push(ms);
    } catch (e) {
      err = e.message;
      if (/time limit|MaxTimeMS/i.test(e.message)) { timeout = true; break; }
      throw e;
    }
  }
  return { result, times, median: median(times), min: times.length ? Math.min(...times) : null, max: times.length ? Math.max(...times) : null, timeout, err };
}

async function main() {
  const o = parseArgs(process.argv);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  if (!o.append) fs.writeFileSync(LOG_FILE, '');
  const write = (rec) => fs.appendFileSync(LOG_FILE, JSON.stringify(rec) + '\n');

  await connectBench();
  // drop any temp collections left by an interrupted earlier run
  const stale = await mongoose.connection.db.listCollections({ name: /^tmp_pt_/ }).toArray();
  for (const c of stale) await mongoose.connection.db.collection(c.name).drop().catch(() => {});
  if (stale.length) console.log(`[cleanup] dropped ${stale.length} stale temp collections`);
  const env = await collectEnvInfo({ uri: benchUri(), bloom_enabled: o.bloom, scale: o.scaleLabel, caps: o.caps, runs: o.runs, max_orders: o.maxOrders, timeout_ms: o.timeoutMs, spec_budget_ms: o.specBudgetMs });
  console.log('[env]', JSON.stringify(env));
  write({ ts: new Date().toISOString(), kind: 'env', ...env });

  const selected = o.specs ? o.specs.map((n) => byName[n]) : specs;
  const summary = [];

  for (const spec of selected) {
    const now = new Date();
    const sizes = await computeSizes(spec, now);
    const allOrders = validJoinOrders(spec);

    // choose orders: seeded sample + best/worst by naive (bounded)
    let orders = seededSample(allOrders, o.maxOrders, o.seed);
    let bestworstUsed = false;
    const remaining = allOrders.filter((ord) => !orders.some((x) => x.join() === ord.join()));
    if (remaining.length > 0 && remaining.length <= o.bestworstMax) {
      let best = null, worst = null;
      for (const ord of remaining) {
        try {
          const r = await runNaive(spec, ord, { now, maxTimeMs: Math.min(o.timeoutMs, 15000) });
          if (!best || r.joinMs < best.ms) best = { ord, ms: r.joinMs };
          if (!worst || r.joinMs > worst.ms) worst = { ord, ms: r.joinMs };
        } catch (_) { if (!worst) worst = { ord, ms: Infinity }; }
      }
      if (best) orders.push(best.ord);
      if (worst && (!best || worst.ord.join() !== best.ord.join())) orders.push(worst.ord);
      bestworstUsed = true;
    } else if (remaining.length > o.bestworstMax) {
      console.log(`  (skipping best/worst: ${remaining.length} remaining > ${o.bestworstMax})`);
    }

    console.log(`\n### SPEC ${spec.name}  (${allOrders.length} valid orders, testing ${orders.length}; best/worst-by-naive=${bestworstUsed})`);
    write({ ts: new Date().toISOString(), kind: 'spec', spec: spec.name, sizes, valid_orders: allOrders.length, tested_orders: orders.length, bestworst: bestworstUsed, scale: o.scaleLabel });

    const results = { naive: [], exact: {}, bloom: {} };
    const exactPreps = new Map();

    // prepare exact reduced per cap
    for (const cap of o.caps) {
      const prep = await prepareReduced(spec, { setKind: 'exact', cap, now, sizes });
      exactPreps.set(cap, prep);
      console.log(`  [exact cap=${cap}] transfer=${prep.transferMs}ms mat=${prep.materializationMs}ms skipped=[${prep.skippedList.join(', ')}]`);
      write({ ts: new Date().toISOString(), kind: 'cap', spec: spec.name, mode: 'exact', cap, transfer_ms: prep.transferMs, materialization_ms: prep.materializationMs, skipped: prep.skippedList, scale: o.scaleLabel });
    }

    // bloom (optional) at each cap, guarded
    const bloomPreps = new Map();
    if (o.bloom) {
      for (const cap of o.caps) {
        try {
          const t0 = Date.now();
          const prep = await prepareReduced(spec, { setKind: 'bloom', cap, now, sizes });
          bloomPreps.set(cap, prep);
          console.log(`  [bloom cap=${cap}] transfer=${prep.transferMs}ms mat=${prep.materializationMs}ms skipped=[${prep.skippedList.join(', ')}]`);
          write({ ts: new Date().toISOString(), kind: 'cap', spec: spec.name, mode: 'bloom', cap, transfer_ms: prep.transferMs, materialization_ms: prep.materializationMs, skipped: prep.skippedList, scale: o.scaleLabel });
        } catch (e) {
          console.log(`  [bloom cap=${cap}] FAILED: ${e.message}`);
          write({ ts: new Date().toISOString(), kind: 'cap', spec: spec.name, mode: 'bloom', cap, error: e.message, scale: o.scaleLabel });
        }
      }
    }

    const defaultCap = o.caps[Math.min(1, o.caps.length - 1)];

    const specStart = Date.now();
    for (let oi = 0; oi < orders.length; oi++) {
      if (Date.now() - specStart > o.specBudgetMs) {
        console.log(`  (spec budget ${o.specBudgetMs}ms exceeded; ${orders.length - oi} orders skipped)`);
        write({ ts: new Date().toISOString(), kind: 'skipped', spec: spec.name, scale: o.scaleLabel, remaining: orders.length - oi, reason: 'spec budget' });
        break;
      }
      const order = orders[oi];
      const alt = oi % 2 === 0;
      const runNaiveFn = () => runNaive(spec, order, { now, maxTimeMs: o.timeoutMs }).then((r) => ({ result: r.result, ms: r.joinMs }));
      const exactPrep = exactPreps.get(o.caps[0]);
      const runExactFn = () => joinReduced(spec, order, exactPrep, now).then((r) => ({ result: r.result, ms: r.joinMs }));

      const doNaive = async () => measure(runNaiveFn, o.runs);
      const doExact = async () => measure(runExactFn, o.runs);

      let n, ex;
      if (alt) { n = await doNaive(); ex = await doExact(); } else { ex = await doExact(); n = await doNaive(); }

      // equality
      let equal = { equal: true };
      if (ex.timeout || n.timeout) equal = { equal: false, reason: 'timeout' };
      else equal = resultsEqual(n.result, ex.result);
      if (!equal.equal && equal.reason !== 'timeout') {
        write({ ts: new Date().toISOString(), kind: 'mismatch', spec: spec.name, order: order.join('>'), reason: equal.reason });
        throw new Error(`EQUALITY MISMATCH spec=${spec.name} order=${order.join('>')}: ${equal.reason}`);
      }

      const rec = {
        ts: new Date().toISOString(), kind: 'order', spec: spec.name, order: order.join('>'), scale: o.scaleLabel,
        naive: { median: n.median, min: n.min, max: n.max, times: n.times, timeout: n.timeout },
        exact: { median: ex.median, min: ex.min, max: ex.max, times: ex.times, timeout: ex.timeout },
        transfer_ms: exactPrep.transferMs, materialization_ms: exactPrep.materializationMs,
        total_median_ms: ex.median == null ? null : exactPrep.transferMs + exactPrep.materializationMs + ex.median,
        checksum: checksum(n.result || []), equal: equal.equal && !n.timeout && !ex.timeout
      };

      if (o.bloom && bloomPreps.get(defaultCap)) {
        const bp = bloomPreps.get(defaultCap);
        const bm = await measure(() => joinReduced(spec, order, bp, now).then((r) => ({ result: r.result, ms: r.joinMs })), o.runs);
        const beq = bm.timeout ? { equal: false, reason: 'timeout' } : resultsEqual(n.result || [], bm.result || []);
        rec.bloom = { median: bm.median, min: bm.min, max: bm.max, times: bm.times, timeout: bm.timeout, equal: beq.equal };
        if (!results.bloom[defaultCap]) results.bloom[defaultCap] = [];
        results.bloom[defaultCap].push(rec.bloom);
        if (!beq.equal && beq.reason !== 'timeout') throw new Error(`BLOOM EQUALITY MISMATCH ${spec.name} ${order.join('>')}: ${beq.reason}`);
      }

      results.naive.push(rec.naive);
      if (!results.exact[o.caps[0]]) results.exact[o.caps[0]] = [];
      results.exact[o.caps[0]].push(rec.exact);
      console.log(`  order ${order.join('>')}: naive=${fmt(n.median)}ms exact=${fmt(ex.median)}ms${rec.bloom ? ' bloom=' + fmt(rec.bloom.median) + 'ms' : ''} eh=${rec.equal}${n.timeout ? ' naive-timeout' : ''}`);
      write(rec);
    }

    // per-cap join timings (exact) beyond the first cap: quick single-order sweep
    const capSkips = {};
    for (const cap of o.caps) { const p = exactPreps.get(cap); capSkips[cap] = p ? p.skippedList : null; }

    const modes = { naive: stats(results.naive, o.timeoutMs), exact: stats(results.exact[o.caps[0]], o.timeoutMs) };
    if (o.bloom && results.bloom[defaultCap]) modes.bloom = stats(results.bloom[defaultCap], o.timeoutMs);
    const summ = {
      ts: new Date().toISOString(), kind: 'summary', spec: spec.name, scale: o.scaleLabel,
      orders: orders.length, modes, cap_skips: capSkips,
      transfer_ms_by_cap: Object.fromEntries([...exactPreps].map(([c, p]) => [c, p.transferMs])),
      materialization_ms_by_cap: Object.fromEntries([...exactPreps].map(([c, p]) => [c, p.materializationMs]))
    };
    console.log(`  summary: naive ratio=${modes.naive.ratio} exact ratio=${modes.exact.ratio}`);
    write(summ);
    summary.push(summ);

    for (const cap of o.caps) await cleanupReduced(exactPreps.get(cap));
    for (const [, p] of bloomPreps) await cleanupReduced(p);
  }

  await disconnectBench();
  console.log('\n[robustness] wrote', LOG_FILE);
}

function fmt(m) { return m == null ? 'timeout' : Math.round(m); }
function stats(rows, timeoutMs) {
  const timeouts = rows.filter((r) => r.timeout).length;
  // a timed-out order is a real data point: count it at the timeout ceiling
  const meds = rows.map((r) => (r.timeout ? (timeoutMs || 0) : r.median)).filter((x) => x != null && x > 0);
  if (!meds.length) return { min: null, median: null, max: null, ratio: null, timeouts };
  const mn = Math.min(...meds), mx = Math.max(...meds);
  return { min: mn, median: median(meds), max: mx, ratio: mn > 0 ? +(mx / mn).toFixed(2) : null, timeouts };
}

main().catch((e) => { console.error('[robustness] FAILED:', e); process.exit(1); });
