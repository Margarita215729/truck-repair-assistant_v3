# Get Help Now — Module Upgrade Summary

> Transforms "Find Services" into a **diagnosis-aware roadside decision module** that tells drivers: *"With this truck issue, here is the safest and most cost-effective next step."*

---

## Architecture Overview

```
Diagnostics (AI chat)
    │
    ├── dtc_analysis / severity / can_drive / symptoms
    │   ↓
    │   [Get Help Now CTA]  ──navigate({state: diagContext})──→
    │
ServiceFinder (Get Help Now)
    ├── Tab 1: For This Issue
    │   ├── NextStepPanel (recommended action)
    │   ├── DriverActionCard[] (what you can do yourself)
    │   └── EnhancedServiceCard[] (ranked & grouped services)
    │
    ├── Tab 2: Help Now (emergency towing, 24/7, call now)
    │
    ├── Tab 3: Search Nearby (classic search — preserved)
    │
    └── Tab 4: Map & Restrictions (infra layers + full map)
```

---

## Files Created (New)

| File | Purpose | Lines |
|------|---------|-------|
| `src/services/getHelpNowService.js` | Core decision engine — models, ranking, scoring, driver actions | ~600 |
| `src/components/services/NextStepPanel.jsx` | "Recommended Next Step" panel with type-aware styling | ~130 |
| `src/components/services/DriverActionCard.jsx` | Expandable driver self-inspection/temp-fix cards | ~150 |
| `src/components/services/EnhancedServiceCard.jsx` | Upgraded service card with HD confidence + issue match | ~210 |

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/ServiceFinder.jsx` | Complete rewrite: 4-tab structure, diagnostic context reception, ranking pipeline, shared UI fragments |
| `src/pages/Diagnostics.jsx` | CTA injection after assistant messages with severe DTCs or urgent parts |
| `src/Layout.jsx` | Nav label changed from `findServices` → `getHelpNow` |
| `src/i18n/en.js` | Added `nav.getHelpNow` + 18 new `services.*` keys for the module |
| `src/i18n/ru.js` | Added matching Russian translations |

## Files NOT Modified

| File | Reason |
|------|--------|
| `api/places-search.js` | Ranking happens client-side; API returns raw results unchanged |
| `src/pages.config.js` | Route key `ServiceFinder` kept for backward compat |
| `src/App.jsx` | `PROTECTED_PAGE_KEYS` still references `ServiceFinder` — no change needed |

---

## Decision Engine (`getHelpNowService.js`)

### Data Models
- **SERVICE_TYPES**: 17 truck-specific service types (heavy\_duty\_repair, mobile\_mechanic, towing\_heavy\_duty, tire\_roadside, trailer\_repair, reefer\_repair, aftertreatment\_dpf\_def, dealer\_service, etc.)
- **ISSUE_SERVICE_MAP**: Maps 18 issue categories → recommended service types
- **DIFFICULTY_LEVELS**: 4 tiers (driver\_basic → shop\_only) with labels and colors

### Core Functions
| Function | Returns | Description |
|----------|---------|-------------|
| `assessDriveability(ctx)` | `'ok'\|'limited'\|'stop_now'\|'unknown'` | Evaluates DTC severity + symptoms |
| `assessUrgency(ctx)` | `'critical'\|'high'\|'medium'\|'low'\|'unknown'` | Maps DTC severity to urgency level |
| `detectIssueCategory(ctx)` | String category | Pattern-matches codes + symptoms to 18 categories |
| `computeNextStep(ctx)` | `{action, description, type, serviceTypes}` | Decision engine: stop/tow/drive\_short/inspect/continue |
| `getDriverActions(cat, drive)` | `[{title, type, difficulty, steps[], warnings[]}]` | Category-specific self-service action templates |
| `rankServices(services, ctx)` | Sorted services with `_score` | Multi-factor scoring (0-100): issue match, safety, HD confidence, urgency, open now, distance, rating, dealer OEM, phone |
| `normalizeServiceResult(raw, ctx)` | Enriched service | Adds `heavyDutyConfidence`, `mobileAvailable`, `dealerAffiliation`, `issueMatchScore`, `issueMatchReasons` |
| `groupServiceSections(ranked, ctx)` | `[{key, title, services[]}]` | Groups into Best Match / Help Now / Open Now / Safe Parking / Backup |

### Scoring Breakdown
| Factor | Max Points |
|--------|-----------|
| Issue match | 30 |
| Safety (towing when stop\_now) | 20 |
| Heavy-duty confidence | 15 |
| Urgency bonus (24/7 + is open) | 10 |
| Currently open / 24-7 | 10 |
| Distance (closer = higher) | 10 |
| Rating | 5 |
| Dealer OEM match | +8 bonus |
| Has phone number | +2 bonus |

---

## 4-Tab Page Structure

### Tab 1: For This Issue (visible only with diagContext)
- **Driveability + Urgency badges** — color-coded status indicators
- **NextStepPanel** — recommended action (stop\_now/tow/drive\_short/inspect\_first/continue\_cautious)
- **DriverActionCard[]** — expandable self-service actions with difficulty, est. time, steps, warnings
- **Grouped service sections** — Best Match → Help Now → Open Now → Safe Parking → Backup

### Tab 2: Help Now
- Emergency banner
- Filters services to towing + 24/7 + phone available
- Sorted by: towing first, then 24/7, then by distance

### Tab 3: Search Nearby
- Classic search — identical to original functionality
- All filters, view modes (list/split/map), infrastructure layers preserved

### Tab 4: Map & Restrictions
- Full-screen map with infrastructure layer toggles
- Truck parking, weigh stations, route restrictions

---

## Diagnostic Integration

When the AI diagnostic chat produces a response with:
- `dtc_analysis[].severity === 'critical'|'high'`
- `dtc_analysis[].can_drive === false`
- `dtc_analysis[].immediate_action_required === true`
- `suggested_parts[].urgency === 'immediate'`
- `suggested_parts[].driveability === 'stop_now'`

A **"Get Help Now — Find Services for This Issue"** CTA button appears below the message. Clicking it navigates to ServiceFinder with full diagnostic context:

```js
navigate('/ServiceFinder', {
  state: {
    diagContext: {
      dtcAnalysis, symptoms, errorCodes,
      issueDescription, suggestedParts,
      repairInstructions, truckInfo
    }
  }
})
```

---

## Backward Compatibility

- Route path `/ServiceFinder` unchanged — all existing links/bookmarks work
- `ServiceCard` still used in Search Nearby tab; `EnhancedServiceCard` only in diagnosis-aware views
- `ServiceFilters` still functional in the collapsible filters panel
- API contract (`/api/places-search`) completely unchanged
- Without `diagContext`, the page defaults to the "Search Nearby" tab — same experience as before
