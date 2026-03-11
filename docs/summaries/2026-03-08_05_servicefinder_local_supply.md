# 05 — ServiceFinder Local Supply Tab

**Date:** 2026-03-08  
**Phase:** 4 — ServiceFinder Rebuild + Local Parts Tab

---

## Overview

Added a new "Local Parts" tab to ServiceFinder that searches for nearby auto parts stores (NAPA, O'Reilly, AutoZone, Advance Auto Parts) using the Google Places API via `localSupplyService`. When diagnostic context is available, the search auto-populates with suggested part names.

## Changes to ServiceFinder.jsx

### New Imports
- `searchLocalSupplyStores` from `@/services/localSupplyService`
- `Store`, `Phone`, `ExternalLink`, `Clock` from `lucide-react`

### New Tab
```js
{ id: 'local_parts', label: 'Local Parts', icon: Store }
```
Inserted between "Search Nearby" and "Map & Restrictions". Always visible (not gated by `diagContext`).

### New State
- `localStores` — array of `ServiceResult` objects from local supply search
- `localStoreLocators` — array of `{ key, url, label }` store locator links
- `localSupplyLoading` — loading state boolean
- `localSupplySearchedRef` — ref to prevent duplicate searches

### Diagnosis Context Flow
When `diagContext` provides suggested parts (`diagContext.suggestedParts[0].name` or `diagContext.diagnosis.possibleParts[0]` or `diagContext.issueDescription`), it's passed as `partName` to the local supply search.

### Auto-Search
When the user switches to the "Local Parts" tab and has coordinates available, the search fires automatically (once, via ref guard).

### renderLocalParts() UI
- **Header:** Emerald-themed banner with optional "Searching for: [part name]" context
- **Store Locators:** Quick links to NAPA/O'Reilly/AutoZone/Advance store locator pages
- **Results:** Cards showing name, address, distance, rating, open/closed status, call button, website link
- **Empty State:** "Find Stores Near Me" button that triggers geolocation or searches with existing coords
