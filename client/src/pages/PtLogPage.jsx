import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const fmtMs = (v) => (v == null ? '—' : `${Math.round(v)} ms`);
const pct = (v) => (v == null ? '—' : `${v}%`);

// Render the record's UTC ISO timestamp in the viewer's local time, with a
// relative age, so a "04:44Z" record never looks five hours off from the clock.
const fmtTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(isNaN(+ts) && typeof ts === 'string' ? ts.replace(' ', 'T') : ts);
  if (isNaN(d.getTime())) return String(ts);
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  const rel = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.floor(mins / 60)} h ago` : `${Math.floor(mins / 1440)} d ago`;
  return `${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · ${rel}`;
};

// Reference for the log records so anyone can tell what a row actually measured.
// Records written since this map was added carry their own `description`; these
// are fallbacks for older lines and for spec/trigger context.
const SPEC_INFO = {
  rare_category_revenue_7d: 'Revenue per vendor for a RARE category over the last 7 days (cat▸p▸oi▸o▸v). Highly selective — triggered by product searches. This is the spec that should win big.',
  common_category_revenue_365d: 'Revenue per vendor for a COMMON category over 365 days. Unselective — transfer overhead outweighs the pruning (honest negative case).',
  vendor_scoped_revenue_90d: 'Revenue per product for one large vendor over 90 days (vendor-scoped).',
  user_scoped_spend_30d: 'Spend per product for a single user over 30 days (user-scoped — extremely selective).',
  low_rating_reviews_by_category: 'Count/avg of low-rating (≤2★) reviews per category (reviews▸products▸categories▸vendors). A known no-win case.',
  vendor_category_revenue_365d: 'Revenue for one vendor + one category over 365 days.',
  user_vendor_category_spend_30d: 'Spend across 6 relations (user+vendor+category+30d). Heaviest spec — transfer+materialization often dominates at small scales.'
};
const KIND_INFO = {
  shadow: 'Live measurement fired by a site action (product search or analytics page) — the row you demo',
  order: 'Benchmark protocol record: one naive-vs-reduced comparison for a single join order',
  summary: 'Benchmark protocol record: per-spec aggregate across all tested orders',
  cap: 'Cap-sweep record: what happens when the $in-transfer size limit changes',
  env: 'Environment snapshot logged with benchmark runs (mongod version, CPU/RAM, Node)',
  spec: 'Spec declaration record: relation sizes and how many valid join orders exist'
};
const ALIAS = { p: 'products', cat: 'categories', oi: 'order items', o: 'orders', v: 'vendors', u: 'users', c: 'categories', r: 'reviews' };
const prettyOrder = (o) => {
  if (!o) return '—';
  const parts = o.split('>').map((s) => ALIAS[s.trim()] || s.trim());
  return parts.join(' ▸ ') + '  (' + o + ')';
};

// Pull the user's actual action out of the trigger URL: /api/products?search=laptop → "laptop"
const userAction = (trigger) => {
  if (!trigger) return null;
  try {
    const [pathname, qs] = String(trigger).split('?');
    const params = new URLSearchParams(qs || '');
    if (pathname.startsWith('/api/products')) {
      const search = params.get('search');
      if (search) return `searched for "${search}"`;
      const category = params.get('category');
      if (category) return `browsed the "${category}" category`;
      return 'opened the Products page';
    }
    if (pathname.startsWith('/api/analytics/admin')) return 'loaded the Admin Dashboard (auto-fired analytics)';
    if (pathname.startsWith('/api/analytics/vendor')) return 'loaded the Vendor Dashboard';
    return pathname;
  } catch (_) { return trigger; }
};

const PtLogPage = ({ onToast }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [runStatus, setRunStatus] = useState({ running: false, startedAt: null });
  const [nowTick, setNowTick] = useState(Date.now());

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [{ data }, { data: st }] = await Promise.all([api.get('/admin/pt-log'), api.get('/admin/pt-status').catch(() => ({ data: { running: false } }))]);
      setRecords(Array.isArray(data) ? data : []);
      setRunStatus(st && typeof st === 'object' ? st : { running: false });
    } catch (err) {
      if (!silent && onToast) onToast('Could not load mongo-pt log', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onToast]);

  // Poll so comparisons appear while a background run finishes.
  useEffect(() => {
    load(false);
    const id = setInterval(() => load(true), 5000);
    const tick = setInterval(() => setNowTick(Date.now()), 1000); // elapsed-time ticker
    return () => { clearInterval(id); clearInterval(tick); };
  }, [load]);

  const shadows = records.filter((r) => r.kind === 'shadow');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <Activity size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                mongo-pt Shadow Log
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold ${
                  runStatus.running
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {runStatus.running && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  {runStatus.running && runStatus.startedAt
                    ? `MEASUREMENT RUNNING · ${Math.round(((nowTick - new Date(runStatus.startedAt).getTime()) / 1000))} s elapsed`
                    : 'IDLE — no measurement running'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {runStatus.running
                  ? 'A background benchmark is being measured right now — your request was never slowed. A new row appears here (every 5 s) when it finishes — typical run ≈ 1 min on the current dataset.'
                  : 'Search the Products page (e.g. type "laptop") to fire one; the chip above turns amber while it runs. Last 100 records log shown below.'}
              </p>
              <p className="text-xs text-slate-500">{shadows.length} shadow runs in view.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => load(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-[11px] text-indigo-700">
                <span className="font-bold">Click any row</span> to see the full story: which action fired the measurement, what the benchmark query computed, and how the naive vs reduced times were produced.
              </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-bold">Time</th>
                    <th className="px-4 py-3 font-bold">Kind</th>
                    <th className="px-4 py-3 font-bold">Spec</th>
                    <th className="px-4 py-3 font-bold">Order</th>
                    <th className="px-4 py-3 font-bold text-right">Naive</th>
                    <th className="px-4 py-3 font-bold text-right">Reduced</th>
                    <th className="px-4 py-3 font-bold text-right">Speedup</th>
                    <th className="px-4 py-3 font-bold text-right">Transfer</th>
                    <th className="px-4 py-3 font-bold text-right">Mat</th>
                    <th className="px-4 py-3 font-bold text-right">Overhead</th>
                    <th className="px-4 py-3 font-bold text-center">Equal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                        No log records yet. Enable <code className="font-mono">PT_SHADOW=1</code> and hit an analytics endpoint.
                      </td>
                    </tr>
                  )}
                  {records.map((r, i) => {
                    const isOpen = expanded.has(i);
                    const toggle = () => setExpanded((prev) => {
                      const next = new Set(prev);
                      next.has(i) ? next.delete(i) : next.add(i);
                      return next;
                    });
                    return (
                      <React.Fragment key={i}>
                        <tr className="hover:bg-slate-50 cursor-pointer" onClick={toggle}>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap" title={r.ts ? `${r.ts} (UTC) → local: ${r.ts ? new Date(r.ts).toLocaleString() : '—'} — click for details` : ''}>
                        {fmtTime(r.ts)} {isOpen ? '▾' : '▸'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          r.kind === 'shadow' ? 'bg-indigo-100 text-indigo-700'
                            : r.kind === 'summary' ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`} title={KIND_INFO[r.kind] || ''}>{r.kind || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800" title={r.description || SPEC_INFO[r.spec] || 'Benchmark spec'}>
                        <span className="underline decoration-dotted underline-offset-2">{(r.spec || '—').replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-[220px] truncate" title={prettyOrder(r.order)}>{r.order || '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtMs(r.naive_ms)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtMs(r.reduced_ms ?? r.total_ms)}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        {r.speedup == null ? '—' : (
                          <span className={r.speedup >= 1 ? 'text-emerald-600' : 'text-rose-600'}>{r.speedup}x</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtMs(r.transfer_ms)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtMs(r.materialization_ms)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{pct(r.transfer_overhead_pct)}</td>
                      <td className="px-4 py-3 text-center">
                        {r.equal == null
                          ? <span className="text-slate-400">n/v</span>
                          : r.equal
                            ? <span className="text-emerald-600 font-bold">ok</span>
                            : <span className="text-rose-600 font-bold" title={r.mismatch || ''}>FAIL</span>}
                      </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50">
                            <td colSpan={11} className="px-4 py-3">
                              <div className="text-[11px] text-slate-600 space-y-1">
                                <p><span className="font-bold">Your action that logged this record:</span> {userAction(r.trigger)}</p>
                                <p><span className="font-bold">Fired by:</span> <code className="font-mono">{r.trigger}</code></p>
                                <p className="text-slate-400"><span className="font-bold">Spec description:</span> {r.description || SPEC_INFO[r.spec]}</p>
                                <p className="text-slate-400">The bench spec is a fixed benchmark query — your search didn't run it. Your search hits the normal (unoptimized) shop path; in parallel, this background measurement runs the spec on the separate bench DB (<code className="font-mono">shopsphere_bench</code>) and logs the result here.</p>
                                <p><span className="font-bold">Join path (join order:</span> {prettyOrder(r.order)}) — the milestones are collections; the pinned bad order is why the naive side is slow.</p>
                                {r.result_rows != null && <p><span className="font-bold">Result rows:</span> {r.result_rows}{r.checksum && <>  ·  <span className="font-bold">checksum:</span> <code className="font-mono">{r.checksum}</code> (both sides must match — `ok` above)</>}</p>}
                                {r.runs != null && <p><span className="font-bold">Runs:</span> {r.runs} per side, median shown.</p>}
                                {KIND_INFO[r.kind] && <p className="text-slate-400"><span className="font-bold">Kind:</span> {KIND_INFO[r.kind]}</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          Transfer and materialization are reported separately and are already included in the reduced time;
          overhead = (transfer + materialization) / reduced total. Shadow runs execute in a detached process
          against <code className="font-mono">shopsphere_bench</code> and never affect API latency.
        </p>
      </div>
    </div>
  );
};

export default PtLogPage;
