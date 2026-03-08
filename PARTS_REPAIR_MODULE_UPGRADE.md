# Repair Parts Module Upgrade

## Overview

Complete redesign of "Parts Catalog" → **Repair Parts** — a diagnostic-driven decision module. Core philosophy: *Identify the correct OEM part first, then show the best sourcing options.*

---

## Files Modified

### Backend
| File | Change |
|---|---|
| `api/parts/search.js` | Full rewrite. Returns unified `{ listings: VendorListing[], searchUrls, meta }`. Added `SOURCE_TIERS`, `normalizeEbayListing()`, `normalizeFinditPartsListing()`, `rankListings()`, `buildSearchUrls()`. OEM-aware ranking by trust tier. |

### Service Layer
| File | Change |
|---|---|
| `src/services/vendorService.js` | Added `SOURCE_TIER_LABELS`, `groupByTier()`, `filterBySourceType()`, `hasListings()`. Expanded `VENDOR_INFO` with tier property. Backward-compatible `aggregateListings()`. |
| `src/services/partsService.js` | `saveAIPartRecommendations()` persists 13 new decision fields. `getMyRecommendedParts()` supports urgency/driveability/action_type filters. |

### UI Components
| File | Change |
|---|---|
| `src/pages/PartsCatalog.jsx` | Full rewrite with 4 tabs: "For This Issue", "Search Parts", "Buy Fast", "Saved". `classifySearch()` for input routing. Tier-grouped vendor display. |
| `src/components/parts/PartCard.jsx` | Trust tier badges (T1-T4), OEM/fitment/counterfeit indicators, urgency/driveability/action_type badges, paired parts preview. |
| `src/components/parts/PartDetailModal.jsx` | 5 new sections: Decision Fields grid, OEM Part Information, Inspection Steps, Paired Parts, Service Indicators. |
| `src/components/parts/PartFilters.jsx` | Recommended mode: category, urgency, driveability, action_type, importance. Search mode: condition, sourceType, sourceTier, sort (with trust option). |
| `src/components/diagnostics/SuggestedParts.jsx` | Fixed broken `fleetpride/truckpro` fallback → `{ listings: [] }`. Added urgency/driveability/action_type badges. Updated nav link. |

### Database
| File | Change |
|---|---|
| `supabase/migrations/013_parts_decision_fields.sql` | New migration adding 13 columns: `oem_part_number`, `alt_part_numbers`, `root_cause_confidence`, `urgency`, `driveability`, `action_type`, `roadside_possible`, `shop_required`, `programming_required`, `inspection_steps`, `pair_with_parts`, `bundle_label`, `fitment_status`. Partial indexes on urgency, action_type, driveability. |

### i18n
| File | Change |
|---|---|
| `src/i18n/en.js` | Nav: "Repair Parts". 15 new keys (tab labels, empty states, etc.). |
| `src/i18n/ru.js` | Nav: "Ремонтные запчасти". Matching 15 Russian translations. |

---

## New Data Model

### Unified VendorListing
All vendor sources (eBay, FinditParts, AI fallback) normalize to a single listing shape with a 4-tier trust system:

| Tier | Label | Examples |
|------|-------|----------|
| 1 | Manufacturer / OEM | Direct OEM stores |
| 2 | Authorized Dealer / Specialist | FinditParts, authorized distributors |
| 3 | Aftermarket Vendor | RockAuto, aftermarket suppliers |
| 4 | Marketplace | eBay, Amazon |

### 13 Decision Fields
| Field | Type | Purpose |
|-------|------|---------|
| `oem_part_number` | text | The correct OEM part number |
| `alt_part_numbers` | jsonb | Compatible alternates |
| `root_cause_confidence` | text | How confident the diagnosis is |
| `urgency` | text | critical / high / medium / low |
| `driveability` | text | do_not_drive / limp_mode / reduced_performance / safe_to_drive |
| `action_type` | text | replace_now / inspect_first / order_ahead / monitor |
| `roadside_possible` | boolean | Can be done roadside |
| `shop_required` | boolean | Requires a shop |
| `programming_required` | boolean | Needs ECU programming |
| `inspection_steps` | jsonb | Ordered inspection checklist |
| `pair_with_parts` | jsonb | Parts that should be replaced together |
| `bundle_label` | text | Label for the parts bundle |
| `fitment_status` | text | confirmed / likely / unverified |

---

## Critical Fixes
- **Backend/Frontend mismatch resolved**: All components now use unified `{ listings: [] }` instead of the broken `{ fleetpride: [], truckpro: [] }` shape.
- **`hasListings()` helper**: Replaces all manual array-length checks.
- **Backward compatibility**: `aggregateListings()` shim handles any remaining legacy callers.
