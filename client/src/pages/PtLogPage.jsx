import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const fmtMs = (v) => (v == null ? '—' : `${Math.round(v)} ms`);
const pct = (v) => (v == null ? '—' : `${v}%`);

const PtLogPage = ({ onToast }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/admin/pt-log');
      setRecords(Array.isArray(data) ? data : []);
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
    return () => clearInterval(id);
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
              <h1 className="text-2xl font-extrabold text-slate-900">mongo-pt Shadow Log</h1>
              <p className="text-xs text-slate-500">
                Last 100 records from the predicate-transfer benchmark log ({shadows.length} shadow runs)
              </p>
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
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {r.ts ? new Date(r.ts).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          r.kind === 'shadow' ? 'bg-indigo-100 text-indigo-700'
                            : r.kind === 'summary' ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>{r.kind || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.spec || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-[220px] truncate" title={r.order}>{r.order || '—'}</td>
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
                  ))}
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
