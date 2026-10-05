'use strict';
/**
 * The transfer pass. Executes an ordered schedule of semi-joins:
 *
 *   for each step (target <- filterBy on targetField/filterField):
 *     incoming = distinct values filterBy currently holds on filterField
 *     if |incoming| > cap -> SKIP the step and log it
 *     else apply `targetField IN incoming` as a constraint on target
 *     record keysIn, keysOut (per outgoing edge), docs examined, time
 *
 * Using exact sets makes each step a true semi-join, which is what gives the
 * paper's full-reduction / robustness guarantee. The cap is the honest
 * trade-off documented in docs/pt-design.md.
 *
 * Returns { schedule, steps: [...stats], constraints, localFilters, sizes }.
 * `constraints` (alias -> [{field, set}]) defines the reduced relation that is
 * later materialised for the join phase.
 */
const { buildSchedule } = require('./schedule');
const { modelForCollection, resolveLocalFilter } = require('./querySpec');
const { makeSet } = require('./filters');

function incomingCap() {
  const v = parseInt(process.env.PT_IN_CAP || '', 10);
  return Number.isFinite(v) && v > 0 ? v : 50000;
}

function constraintsToMatch(constraints) {
  const parts = constraints.map((c) => c.set.toMongoClause(c.field));
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function outgoingFields(graph, alias) {
  const fields = [];
  for (const e of graph.edges) {
    if (e.a !== alias && e.b !== alias) continue;
    const other = e.a === alias ? e.b : e.a;
    for (const p of e.pairs) {
      if (Object.prototype.hasOwnProperty.call(p, alias) && Object.prototype.hasOwnProperty.call(p, other)) {
        fields.push({ field: p[alias], otherAlias: other });
      }
    }
  }
  return fields;
}

async function docsExamined(Model, match) {
  try {
    const ex = await Model.find(match).explain('executionStats');
    const es = ex && (ex.executionStats || (ex[0] && ex[0].executionStats));
    return es ? es.totalDocsExamined : null;
  } catch (_) {
    return null;
  }
}

async function runTransfer(spec, options = {}) {
  const log = options.log || (() => {});
  const cap = options.cap || incomingCap();
  const now = options.now || new Date();
  const sizes = options.sizes || {};
  const setKind = options.setKind || null; // 'exact' | 'bloom' | null(=env)
  const schedule = buildSchedule(spec, sizes);

  const localFilters = new Map();
  for (const r of spec.relations) localFilters.set(r.alias, resolveLocalFilter(r.localFilter || {}, now));

  const constraints = new Map(spec.relations.map((r) => [r.alias, []]));
  const setCache = new Map(); // alias -> Map(field -> FilterSet)
  const invalidate = (alias) => setCache.delete(alias);

  async function getSet(alias, field) {
    let perAlias = setCache.get(alias);
    if (!perAlias) { perAlias = new Map(); setCache.set(alias, perAlias); }
    if (perAlias.has(field)) return perAlias.get(field);
    const Model = modelForCollection(spec.relations.find((r) => r.alias === alias).collection);
    const match = { $and: [localFilters.get(alias), constraintsToMatch(constraints.get(alias))] };
    const values = await Model.distinct(field, match);
    const s = makeSet(values, setKind);
    perAlias.set(field, s);
    return s;
  }

  const stats = [];
  for (const step of schedule.steps) {
    const { target, filterBy, direction, on } = step;
    const started = Date.now();
    const incoming = await getSet(filterBy, on.filterField);
    const keysIn = incoming.size();

    if (keysIn > cap) {
      const skipped = {
        target, filterBy, direction,
        targetField: on.targetField, filterField: on.filterField,
        keysIn, keysOut: null, docsExamined: null,
        timeMs: Date.now() - started, skipped: true,
        reason: `incoming set ${keysIn} > cap ${cap}`
      };
      stats.push(skipped);
      log(`  SKIP ${direction.padEnd(8)} ${target} <- ${filterBy} : |in|=${keysIn} > cap ${cap}`);
      continue;
    }

    constraints.get(target).push({ field: on.targetField, set: incoming });
    invalidate(target);

    const tModel = modelForCollection(spec.relations.find((r) => r.alias === target).collection);
    const tMatch = { $and: [localFilters.get(target), constraintsToMatch(constraints.get(target))] };
    const examined = await docsExamined(tModel, tMatch);

    const keysOut = {};
    for (const of of outgoingFields(schedule.graph, target)) {
      const s = await getSet(target, of.field);
      keysOut[`${target}.${of.field}`] = s.size();
    }

    stats.push({
      target, filterBy, direction,
      targetField: on.targetField, filterField: on.filterField,
      keysIn, keysOut, docsExamined: examined,
      timeMs: Date.now() - started, skipped: false
    });
    log(`  ${direction.padEnd(8)} ${target} <- ${filterBy} : |in|=${keysIn} docs=${examined} keysOut=${JSON.stringify(keysOut)} ${Date.now() - started}ms`);
  }

  return { schedule, stats, constraints, localFilters, sizes };
}

/** Estimate relation sizes for LargestRoot. */
async function computeSizes(spec, now = new Date()) {
  const sizes = {};
  for (const r of spec.relations) {
    const Model = modelForCollection(r.collection);
    const f = resolveLocalFilter(r.localFilter || {}, now);
    const hasFilter = f && Object.keys(f).length > 0;
    sizes[r.alias] = hasFilter ? await Model.countDocuments(f) : await Model.estimatedDocumentCount();
  }
  return sizes;
}

module.exports = { runTransfer, computeSizes, incomingCap, constraintsToMatch, outgoingFields };
