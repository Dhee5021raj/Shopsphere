'use strict';
/**
 * Step 6 — build docs/results.md, docs/results.csv, docs/results-chart.csv and
 * docs/results-chart.html from server/logs/pt-log.jsonl. Every file starts with
 * the environment header (mongod version, CPU, RAM, other heavy processes).
 *
 * Usage: node benchmarks/report.js
 */
const fs = require('fs');
const path = require('path');

const LOG = process.env.PT_LOG || path.join(__dirname, '..', 'logs', 'pt-log.jsonl');
const SUFFIX = process.env.PT_REPORT_SUFFIX || '';
const DOCS = path.join(__dirname, '..', '..', 'docs');

function readLog() {
  const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function envHeader(env) {
  if (!env) return '> Environment: unknown\n';
  return [
    '> **Environment**',
    `> mongod ${env.mongod_version} | ${env.cpu_count}-core ${env.cpu_model} | ` +
    `${env.total_mem_gb} GB RAM (${env.free_mem_gb} GB free) | ${env.platform} | Node ${env.node_version}`,
    `> scale=${env.scale} runs=${env.runs} caps=[${(env.caps || []).join(', ')}] bloom=${env.bloom_enabled} timeout=${env.timeout_ms}ms`,
    `> other heavy processes: ${(env.heavy_processes || []).join('; ') || 'none > 500MB'}`,
    ''
  ].join('\n');
}

function md(s, env) {
  const summaries = s.filter((r) => r.kind === 'summary');
  const orders = s.filter((r) => r.kind === 'order');
  const caps = s.filter((r) => r.kind === 'cap');
  const specs = s.filter((r) => r.kind === 'spec');

  let out = '# mongo-pt robustness results\n\n' + envHeader(env);
  out += `Generated ${new Date().toISOString()} from \`server/logs/pt-log.jsonl\`.\n\n`;
  out += '## Per-query summary (total time = transfer + materialization + join)\n\n';
  out += '| spec | orders | naive median | naive min/max | naive gap | exact median | exact min/max | exact gap | transfer (ms) | mat. (ms) |\n';
  out += '|---|---|---|---|---|---|---|---|---|---|\n';
  for (const sm of summaries) {
    const n = sm.modes.naive || {};
    const e = sm.modes.exact || {};
    const t = sm.transfer_ms_by_cap ? sm.transfer_ms_by_cap[Object.keys(sm.transfer_ms_by_cap)[0]] : '-';
    const m = sm.materialization_ms_by_cap ? sm.materialization_ms_by_cap[Object.keys(sm.materialization_ms_by_cap)[0]] : '-';
    out += `| ${sm.spec} | ${sm.orders} | ${fmt(n.median)} | ${fmt(n.min)}/${fmt(n.max)} | ${n.ratio ?? '-'} | ${fmt(e.median)} | ${fmt(e.min)}/${fmt(e.max)} | ${e.ratio ?? '-'} | ${t} | ${m} |\n`;
  }

  out += '\n## Cap sweep (which transfer edges get skipped)\n\n';
  out += '| spec | mode | cap | transfer ms | mat ms | skipped edges |\n|---|---|---|---|---|---|\n';
  for (const c of caps) {
    out += `| ${c.spec} | ${c.mode} | ${c.cap} | ${c.transfer_ms ?? '-'} | ${c.materialization_ms ?? '-'} | ${c.skipped ? c.skipped.join(', ') || '(none)' : (c.error || '-')} |\n`;
  }

  out += '\n## Where it did NOT help\n\n';
  let anyNot = false;
  for (const sm of summaries) {
    const n = sm.modes.naive || {}, e = sm.modes.exact || {};
    const naiveMed = n.median ?? Infinity, exactMed = e.median ?? Infinity;
    const overhead = (sm.transfer_ms_by_cap ? sm.transfer_ms_by_cap[Object.keys(sm.transfer_ms_by_cap)[0]] : 0)
      + (sm.materialization_ms_by_cap ? sm.materialization_ms_by_cap[Object.keys(sm.materialization_ms_by_cap)[0]] : 0);
    if (exactMed + overhead >= naiveMed) {
      anyNot = true;
      out += `- **${sm.spec}**: reduced total ${Math.round(exactMed + overhead)} ms >= naive ${Math.round(naiveMed)} ms ` +
        `(transfer+mat overhead ${Math.round(overhead)} ms; transfer overhead is reported separately, never hidden).\n`;
    }
  }
  if (!anyNot) out += '_No spec failed to improve in this run._\n';

  out += '\n## Per-join-order detail\n\n';
  out += '| spec | order | naive med (ms) | exact med (ms) | bloom med (ms) | transfer | mat | total | equal |\n|---|---|---|---|---|---|---|---|---|\n';
  for (const r of orders) {
    out += `| ${r.spec} | \`${r.order}\` | ${fmt(r.naive.median)} | ${fmt(r.exact.median)} | ${r.bloom ? fmt(r.bloom.median) : '-'} | ${r.transfer_ms} | ${r.materialization_ms} | ${fmt(r.total_median_ms)} | ${r.equal ? 'ok' : 'TIMEOUT'} |\n`;
  }
  out += '\n## Specs\n\n';
  for (const sp of specs) out += `- **${sp.spec}** — ${sp.valid_orders} valid orders, tested ${sp.tested_orders}; sizes ${JSON.stringify(sp.sizes)}\n`;
  return out;
}

function fmt(x) { return x == null ? '-' : Math.round(x); }

function csv(s) {
  const orders = s.filter((r) => r.kind === 'order');
  let out = 'spec,order,naive_median_ms,exact_median_ms,bloom_median_ms,transfer_ms,materialization_ms,total_ms,equal\n';
  for (const r of orders) {
    out += [r.spec, r.order, r.naive.median ?? '', r.exact.median ?? '', r.bloom ? (r.bloom.median ?? '') : '', r.transfer_ms, r.materialization_ms, r.total_median_ms ?? '', r.equal].join(',') + '\n';
  }
  return out;
}

function chartCsv(s) {
  const orders = s.filter((r) => r.kind === 'order');
  let out = 'spec,order,naive_ms,reduced_ms,bloom_ms\n';
  for (const r of orders) out += [r.spec, r.order, r.naive.median ?? '', r.exact.median ?? '', r.bloom ? (r.bloom.median ?? '') : ''].join(',') + '\n';
  return out;
}

function svgChart(s, env) {
  const orders = s.filter((r) => r.kind === 'order');
  const bySpec = {};
  for (const r of orders) (bySpec[r.spec] = bySpec[r.spec] || []).push(r);
  const pick = Object.keys(bySpec)
    .map((k) => {
      const rs = bySpec[k];
      const gap = (a) => { const v = a.map((x) => x.naive.median).filter((x) => x != null); return v.length ? Math.max(...v) / Math.max(1, Math.min(...v)) : 0; };
      return { k, gap: gap(rs), rs };
    })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2);

  let html = `<html><head><meta charset="utf-8"><title>mongo-pt: time per join order</title></head><body>\n`;
  html += `<h1>mongo-pt — time per join order (naive vs reduced)</h1>\n`;
  html += envHeader(env).replace(/^> /gm, '').replace(/^#+ /gm, '') + '\n';
  for (const { k, rs } of pick) {
    const W = 900, rowH = 26, pad = 60;
    const H = pad + rs.length * rowH + 20;
    const maxV = Math.max(...rs.flatMap((r) => [r.naive.median || 0, r.exact.median || 0, r.bloom && r.bloom.median || 0]), 1);
    html += `<h2>${k}</h2><svg width="${W}" height="${H}" font-family="sans-serif" font-size="11">`;
    rs.forEach((r, i) => {
      const y = pad + i * rowH;
      const nw = ((r.naive.median || 0) / maxV) * (W - 360);
      const ew = ((r.exact.median || 0) / maxV) * (W - 360);
      const bw = r.bloom ? ((r.bloom.median || 0) / maxV) * (W - 360) : 0;
      html += `<text x="4" y="${y + 12}">${r.order}</text>`;
      html += `<rect x="240" y="${y}" width="${nw}" height="9" fill="#c0392b"/>`;
      html += `<rect x="240" y="${y + 10}" width="${ew}" height="9" fill="#27ae60"/>`;
      if (r.bloom) html += `<rect x="240" y="${y + 20}" width="${bw}" height="5" fill="#2980b9"/>`;
      html += `<text x="${244 + Math.max(nw, ew, bw)}" y="${y + 12}">n=${fmt(r.naive.median)} r=${fmt(r.exact.median)}${r.bloom ? ' b=' + fmt(r.bloom.median) : ''}</text>`;
    });
    html += `</svg>\n`;
  }
  html += `<p>red = naive, green = exact-reduced, blue = bloom-reduced. Bars scaled per spec.</p></body></html>\n`;
  return html;
}

function main() {
  if (!fs.existsSync(LOG)) { console.error('no log file', LOG); process.exit(1); }
  const s = readLog();
  const env = s.find((r) => r.kind === 'env');
  fs.mkdirSync(DOCS, { recursive: true });
  fs.writeFileSync(path.join(DOCS, `results${SUFFIX}.md`), md(s, env));
  fs.writeFileSync(path.join(DOCS, `results${SUFFIX}.csv`), envHeader(env).replace(/^> ?/gm, '# ') + csv(s));
  fs.writeFileSync(path.join(DOCS, `results-chart${SUFFIX}.csv`), chartCsv(s));
  fs.writeFileSync(path.join(DOCS, `results-chart${SUFFIX}.html`), svgChart(s, env));
  console.log(`wrote docs/results${SUFFIX}.md, results${SUFFIX}.csv, results-chart${SUFFIX}.csv, results-chart${SUFFIX}.html`);
}

main();
