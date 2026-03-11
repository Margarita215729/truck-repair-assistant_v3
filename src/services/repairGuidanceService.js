/**
 * Repair Guidance Service — builder / normalizer / API
 *
 * Consumes diagnostic, part, and service contexts and produces
 * structured repair guidance (RepairGuidanceAction[]) grouped into
 * the canonical 4 buckets (Check First / Temporary Mitigation /
 * Do Not Do This / Escalate Now).
 *
 * This is the single entry-point that Diagnostics, Parts Catalog,
 * and Get Help Now all call to obtain guidance data.
 */

import {
  GUIDANCE_RULES,
  PARTS_GUIDANCE_RULES,
  CATEGORY_ALIAS,
  BUCKET_ORDER,
  BUCKET_CONFIG,
  DIFFICULTY_CONFIG,
  SAFETY_CONFIG,
  DIFFICULTY,
  SAFETY,
} from '../utils/repairGuidanceRules';

import {
  assessDriveability,
  assessUrgency,
  detectIssueCategory,
} from './getHelpNowService';

// ─── Context Normalization ──────────────────────────────────────────

/**
 * Normalize any partial context (diagnosis, service, part) into a
 * unified shape that the guidance engine can reason about.
 *
 * @param {object} input
 * @param {string} [input.issueDescription]
 * @param {Array}  [input.dtcAnalysis]
 * @param {Array}  [input.symptoms]
 * @param {Array}  [input.errorCodes]
 * @param {string} [input.issueCategory]
 * @param {string} [input.driveability]
 * @param {string} [input.urgency]
 * @param {object} [input.part]
 * @param {object} [input.telematicsInterpretation]
 * @returns {{ issueCategory: string, driveability: string, urgency: string, part: object|null, raw: object }}
 */
export function normalizeIssueContext(input = {}) {
  const raw = { ...input };

  // Build a minimal diagContext for existing helpers
  const diagContext = {
    issueDescription: input.issueDescription || '',
    dtcAnalysis: input.dtcAnalysis || [],
    symptoms: input.symptoms || [],
    errorCodes: input.errorCodes || [],
    telematicsInterpretation: input.telematicsInterpretation || null,
    diagnosticProgress: input.diagnosticProgress || null,
  };

  // Issue category — prefer explicit, fall back to detection
  let category = input.issueCategory || '';
  if (!category) {
    try { category = detectIssueCategory(diagContext); } catch { category = ''; }
  }
  // Normalize alias
  category = CATEGORY_ALIAS[category] || category || 'general';

  // Driveability & urgency — prefer explicit, fall back to assessment
  const driveability = input.driveability || assessDriveability(diagContext);
  const urgency      = input.urgency      || assessUrgency(diagContext);

  return {
    issueCategory: category,
    driveability,
    urgency,
    part: input.part || null,
    raw,
  };
}

// ─── Action Generation ──────────────────────────────────────────────

/**
 * Generate the full list of guidance actions for a normalized context.
 *
 * @param {{ issueCategory: string, driveability: string, urgency: string, part: object|null }} ctx
 * @returns {import('../utils/repairGuidanceRules').RepairGuidanceAction[]}
 */
export function generateGuidanceActions(ctx) {
  const actions = [];

  // 1) Issue-category rules
  const issueRules = GUIDANCE_RULES[ctx.issueCategory] || GUIDANCE_RULES.general;
  actions.push(...issueRules);

  // 2) Part-category overlay
  if (ctx.part) {
    const partCat = ctx.part.part_category || ctx.part.category || '';
    const partRules = PARTS_GUIDANCE_RULES[partCat] || [];
    actions.push(...partRules);
  }

  // 3) Cross-linked rules from related issue types
  //    (e.g. 'starting' often links to 'battery_charging_electrical')
  const alreadyIncludedIds = new Set(actions.map(a => a.id));
  for (const action of actions) {
    for (const linkedType of (action.linkedIssueTypes || [])) {
      const normLinked = CATEGORY_ALIAS[linkedType] || linkedType;
      if (normLinked !== ctx.issueCategory) {
        const linkedRules = GUIDANCE_RULES[normLinked] || [];
        for (const lr of linkedRules) {
          if (lr.category === 'inspect' && !alreadyIncludedIds.has(lr.id)) {
            alreadyIncludedIds.add(lr.id);
            actions.push({ ...lr, source: 'rule_based' });
          }
        }
      }
    }
  }

  // 4) Filter by driveability context
  return filterByContext(actions, ctx);
}

/**
 * Contextual filter — promote / suppress actions based on urgency and driveability.
 */
function filterByContext(actions, ctx) {
  let filtered = [...actions];

  // If stop_now driveability, push "stop" and "escalate" actions to front
  if (ctx.driveability === 'stop_now') {
    filtered.sort((a, b) => {
      const aScore = (a.actionType === 'stop_now' ? 0 : a.category === 'warning' ? 1 : a.category === 'escalate' ? 2 : 3);
      const bScore = (b.actionType === 'stop_now' ? 0 : b.category === 'warning' ? 1 : b.category === 'escalate' ? 2 : 3);
      return aScore - bScore;
    });
  }

  // Deduplicate by id (keep first occurrence, which is already priority-sorted)
  const seen = new Set();
  filtered = filtered.filter(action => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });

  return filtered;
}

// ─── Bucket Grouping ────────────────────────────────────────────────

/**
 * @typedef {Object} GuidanceBucket
 * @property {string} key   - bucket key (inspect | temporary_fix | warning | escalate)
 * @property {string} title
 * @property {string} icon
 * @property {string} color
 * @property {string} headerColor
 * @property {import('../utils/repairGuidanceRules').RepairGuidanceAction[]} actions
 */

/**
 * Group actions into the canonical 4 display buckets.
 *
 * - **Check First**: category 'inspect'
 * - **Temporary Mitigation**: category 'temporary_fix' or 'mitigation'
 * - **Do Not Do This**: category 'warning'
 * - **Escalate Now**: category 'escalate'
 *
 * @param {import('../utils/repairGuidanceRules').RepairGuidanceAction[]} actions
 * @returns {GuidanceBucket[]}
 */
export function groupIntoBuckets(actions) {
  const map = {};
  for (const key of BUCKET_ORDER) {
    map[key] = [];
  }

  for (const action of actions) {
    const bucket = action.category === 'mitigation' ? 'temporary_fix' : action.category;
    if (map[bucket]) {
      map[bucket].push(action);
    } else {
      // Fallback: treat as inspect
      (map.inspect || []).push(action);
    }
  }

  // Build ordered array, skip empty buckets
  return BUCKET_ORDER
    .filter(key => {
      // Merge mitigation into temporary_fix for display
      if (key === 'mitigation') return false;
      return (map[key] || []).length > 0;
    })
    .map(key => ({
      key,
      ...BUCKET_CONFIG[key],
      actions: map[key],
    }));
}

// ─── Convenience: Full Pipeline ─────────────────────────────────────

/**
 * Main entry point.
 *
 * Takes raw context of any shape and returns:
 *  - `actions`: flat array
 *  - `buckets`: grouped display buckets
 *  - `summary`: compact summary for inline/mini views
 *  - `context`: the normalized context
 *
 * @param {object} rawContext
 */
export function buildGuidance(rawContext) {
  const ctx     = normalizeIssueContext(rawContext);
  const actions = generateGuidanceActions(ctx);
  const buckets = groupIntoBuckets(actions);
  const summary = buildSummary(ctx, actions);

  return { actions, buckets, summary, context: ctx };
}

// ─── Summary Builder ────────────────────────────────────────────────

/**
 * Produces a compact summary object for quick-glance views:
 *  - canDrive: boolean
 *  - inspectFirst: boolean
 *  - temporaryActionCount: number
 *  - escalateNow: boolean
 *  - topAction: RepairGuidanceAction | null (the most important action)
 *  - bucketCounts: Record<string, number>
 */
export function buildSummary(ctx, actions) {
  const bucketCounts = {};
  for (const a of actions) {
    const b = a.category === 'mitigation' ? 'temporary_fix' : a.category;
    bucketCounts[b] = (bucketCounts[b] || 0) + 1;
  }

  const canDrive = ctx.driveability !== 'stop_now';
  const inspectFirst = (bucketCounts.inspect || 0) > 0;
  const temporaryActionCount = (bucketCounts.temporary_fix || 0);
  const escalateNow = ctx.urgency === 'critical' || (bucketCounts.escalate || 0) > 0;

  // Top action: first stop_now, or first warning, or first inspect
  const topAction =
    actions.find(a => a.actionType === 'stop_now') ||
    actions.find(a => a.category === 'warning') ||
    actions.find(a => a.category === 'inspect') ||
    actions[0] || null;

  return {
    canDrive,
    inspectFirst,
    temporaryActionCount,
    escalateNow,
    topAction,
    bucketCounts,
    driveability: ctx.driveability,
    urgency: ctx.urgency,
    issueCategory: ctx.issueCategory,
  };
}

// ─── Part-Specific Guidance ─────────────────────────────────────────

/**
 * Generate guidance specific to a part recommendation.
 * Merges issue-level guidance with part-category overlays.
 *
 * @param {object} part - part object from partsService
 * @param {object} [issueContext] - optional diagnostic context
 */
export function generatePartGuidance(part, issueContext = {}) {
  return buildGuidance({
    ...issueContext,
    part,
    // Use the part's own decision fields if diagnostic context is sparse
    issueCategory: issueContext.issueCategory || part.issue_category || '',
    driveability:  issueContext.driveability  || part.driveability  || undefined,
    urgency:       issueContext.urgency       || part.urgency       || undefined,
  });
}

// ─── Diagnosis-Specific Guidance ────────────────────────────────────

/**
 * Generate guidance from a diagnosis chat context.
 *
 * @param {object} diagContext - from Diagnostics.jsx state
 * @param {object} diagContext.dtcAnalysis
 * @param {string} diagContext.issueDescription
 * @param {Array}  diagContext.symptoms
 * @param {Array}  diagContext.errorCodes
 */
export function generateDiagnosisGuidance(diagContext) {
  return buildGuidance(diagContext);
}

// ─── Service-Decision Guidance ──────────────────────────────────────

/**
 * Generate guidance for the Get Help Now / ServiceFinder context.
 *
 * @param {object} diagContext - router state from Diagnostics → ServiceFinder
 */
export function generateServiceGuidance(diagContext) {
  return buildGuidance(diagContext);
}

// ─── Exports for UI Consumption ─────────────────────────────────────

export { BUCKET_CONFIG, BUCKET_ORDER, DIFFICULTY_CONFIG, SAFETY_CONFIG, DIFFICULTY, SAFETY };
