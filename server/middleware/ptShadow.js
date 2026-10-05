'use strict';
/**
 * Step 7 — shadow logging middleware (off by default).
 *
 * When PT_SHADOW=1, every analytics request that finishes schedules a matching
 * mongo-pt measurement in a DETACHED child process. The response is already
 * sent (`res.on('finish')`), the child has its own bench connection, and any
 * failure is swallowed — the request is never delayed or broken.
 *
 * The endpoint -> spec mapping is a small static table (see SPEC_BY_ROUTE);
 * `null` means no matching spec in the current query set.
 */
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'ptShadow.js');

// Longest-prefix match; keep in sync with the analytics routes.
const SPEC_BY_ROUTE = [
  { route: '/api/analytics/vendor', spec: 'vendor_scoped_revenue_90d' },
  { route: '/api/analytics/admin', spec: 'user_vendor_category_spend_30d' }
];

function specForUrl(url) {
  const pathname = (url || '').split('?')[0];
  let best = null;
  for (const r of SPEC_BY_ROUTE) {
    if (pathname.startsWith(r.route) && (!best || r.route.length > best.route.length)) best = r;
  }
  return best ? best.spec : null;
}

function scheduleShadow(specName, trigger) {
  if (process.env.PT_SHADOW !== '1' || !specName) return null;
  const child = spawn(process.execPath, [SCRIPT, `--spec=${specName}`, `--trigger=${trigger}`], {
    detached: true,
    stdio: 'ignore',
    env: process.env
  });
  child.unref();
  return child.pid;
}

function ptShadow(req, res, next) {
  if (process.env.PT_SHADOW !== '1') return next();
  res.on('finish', () => {
    try {
      const spec = specForUrl(req.originalUrl || req.url);
      if (spec) scheduleShadow(spec, (req.originalUrl || req.url).split('?')[0]);
    } catch (e) {
      console.error('[pt-shadow] schedule failed:', e.message);
    }
  });
  return next();
}

module.exports = ptShadow;
module.exports.specForUrl = specForUrl;
module.exports.scheduleShadow = scheduleShadow;
module.exports.SPEC_BY_ROUTE = SPEC_BY_ROUTE;
