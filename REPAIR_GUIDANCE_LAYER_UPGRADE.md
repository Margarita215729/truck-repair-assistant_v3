# Repair Guidance Layer — Architecture & Upgrade Summary

**Date:** 2025-07-10  
**Module:** Shared Repair Guidance / Driver Action Layer  
**Status:** Complete  

---

## Overview

The Repair Guidance Layer is a **reusable product layer** that provides structured, safety-aware repair guidance across all three core app sections: **Diagnostics**, **Repair Parts**, and **Get Help Now**. It is built on a rule-based foundation that classifies actions by difficulty, safety level, and category, then groups them into 4 display buckets for driver decision support.

This is NOT just UI text generation. It is a **central intelligence module** for:
- Safe driver guidance
- Inspection-first logic
- Temporary mitigation
- Escalation decisions
- Cost/downtime reduction

---

## Architecture

```
┌─────────────────────────────────────────────┐
│      repairGuidanceRules.js (pure config)    │
│  DIFFICULTY · SAFETY · CATEGORY · BUCKETS   │
│  ACTION_TYPE · ISSUE_CATEGORIES · RULES     │
│  PARTS_GUIDANCE_RULES · CATEGORY_ALIAS      │
└───────────────────┬─────────────────────────┘
                    │ imports
┌───────────────────▼─────────────────────────┐
│     repairGuidanceService.js (logic/API)     │
│  normalizeIssueContext() → unified context   │
│  generateGuidanceActions() → flat actions    │
│  filterByContext() → priority sort           │
│  groupIntoBuckets() → 4 display buckets      │
│  buildGuidance() → main pipeline             │
│  buildSummary() → compact summary            │
│  ────────────────────────────────────────    │
│  generatePartGuidance(part, issueCtx)        │
│  generateDiagnosisGuidance(diagCtx)          │
│  generateServiceGuidance(diagCtx)            │
└───────────────────┬─────────────────────────┘
                    │ consumed by
┌───────────────────▼─────────────────────────┐
│            UI Components (3)                 │
│  GuidanceActionCard — expandable action card │
│  GuidanceSection — 4-bucket full view        │
│  GuidanceSummaryBlock — compact summary      │
└─────────────────────────────────────────────┘
```

**Bridge to Existing System:**  
The service imports `assessDriveability`, `assessUrgency`, and `detectIssueCategory` from `getHelpNowService.js` rather than duplicating logic. `CATEGORY_ALIAS` maps the ~12 getHelpNowService category names to ~17 guidance category names.

---

## File Inventory

### New Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/utils/repairGuidanceRules.js` | ~800 | Rule-based foundation — enums, configs, master rule table |
| `src/services/repairGuidanceService.js` | ~270 | Builder/normalizer/API — single entry-point |
| `src/components/guidance/GuidanceActionCard.jsx` | ~220 | Expandable action card with safety/difficulty badges |
| `src/components/guidance/GuidanceSection.jsx` | ~120 | Full 4-bucket collapsible guidance view |
| `src/components/guidance/GuidanceSummaryBlock.jsx` | ~120 | Compact at-a-glance summary card |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/Diagnostics.jsx` | Added guidance imports + GuidanceSummaryBlock + GuidanceSection after diagnostic messages |
| `src/pages/PartsCatalog.jsx` | Added aggregate guidance header in "For This Issue" tab |
| `src/components/parts/PartDetailModal.jsx` | Added part-specific GuidanceSection in modal |
| `src/pages/ServiceFinder.jsx` | Added GuidanceSummaryBlock + GuidanceSection in "For This Issue" tab |
| `src/i18n/en.js` | Added `guidance.*` translation keys (~40 keys) |
| `src/i18n/ru.js` | Added `guidance.*` Russian translations (~40 keys) |

---

## Structured Action Model — `RepairGuidanceAction`

Each guidance action is a rich object with ~20 fields:

```js
{
  id,                   // Unique action identifier
  title,                // Short display title
  description,          // Detailed explanation
  category,             // inspect | temporary_fix | mitigation | escalate | warning
  actionType,           // check | do_now | avoid | call | drive_cautiously | stop_now
  difficulty,           // beginner | intermediate | advanced | professional
  safety,               // safe | caution | warning | danger
  estimatedTime,        // e.g. "10-15 min"
  costSavingPotential,  // e.g. "$50-200"
  downtimeReduction,    // e.g. "Avoid 2-day wait"
  toolsNeeded,          // e.g. ["OBD2 scanner", "wrench set"]
  steps,                // Ordered procedure steps
  safetyWarnings,       // Safety-critical warnings
  successSignals,       // How to confirm fix worked
  escalationSignals,    // When to give up and call pro
  stopSignals,          // When to STOP immediately
  roadsidePossible,     // Can be done roadside?
  safeIfParked,         // Safe if truck is parked?
  requiresTraining,     // Needs specialized training?
  partsNeeded,          // Parts required
  issueCategories,      // Which issue categories this applies to
  crossLinkedRules,     // Related rule references
}
```

---

## 4 Guidance Buckets

| Bucket | Color | Icon | Purpose |
|--------|-------|------|---------|
| **Check First** | Yellow | Search | Inspection-first actions before buying/replacing |
| **Temporary Mitigation** | Orange | Wrench | Safe temporary fixes to reduce downtime |
| **Do Not Do This** | Red | OctagonAlert | Dangerous actions to avoid |
| **Escalate Now** | Red | PhoneCall | Call a professional immediately |

---

## Integration Points

### 1. Diagnostics Page
- **Trigger:** After any assistant message with DTC analysis, repair instructions, or severe/urgent parts
- **Shows:** GuidanceSummaryBlock (always visible) + expandable GuidanceSection
- **Context:** Uses message's `dtc_analysis`, `symptoms`, `errorCodes`, `repair_instructions`

### 2. Repair Parts — "For This Issue" Tab
- **PartsCatalog header:** Aggregate guidance based on the most urgent recommended part
- **PartDetailModal:** Part-specific guidance section with collapsible GuidanceSection
- **Context:** Uses part's `category`, `urgency`, `driveability`, `why_needed`, `related_error_codes`

### 3. Get Help Now — "For This Issue" Tab
- **After Driver Actions:** GuidanceSummaryBlock + expandable GuidanceSection
- **Context:** Uses full `diagContext` passed from Diagnostics page via router state

---

## Rule Coverage

### Issue Categories (17)
engine, transmission, brakes, electrical, exhaust, fuel_system, cooling, suspension, drivetrain, turbo, aftertreatment, hvac, air_system, lighting, body, tires, general

### Parts Categories (7)
sensors, filters, electrical, cooling, fuel_system, exhaust, brakes

---

## Fallback Behavior

- If no rules match the detected issue category → falls back to `general` rules
- If `CATEGORY_ALIAS` can't map → uses original category or `general`
- If no actions generated → UI components gracefully hide (conditional rendering)
- Empty buckets are not displayed

---

## i18n Support

All UI-facing strings have translation keys in the `guidance.*` namespace:
- 40 keys in English (`src/i18n/en.js`)
- 40 keys in Russian (`src/i18n/ru.js`)

Covers: bucket titles, badge labels, difficulty levels, safety levels, meta labels, CTA text.
