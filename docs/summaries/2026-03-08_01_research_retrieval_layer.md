# 01 — Research & Retrieval Layer

**Date:** 2026-03-08  
**Phase:** 1 — Shared Utilities, Backends, Services

---

## Overview

Built the shared foundation that all search features depend on: domain trust classification, normalised data models, CSE query construction with verified OEM portals, and link verification utilities — plus the backend APIs and frontend services that consume them.

## Files Created

| File | Purpose |
|------|---------|
| `src/utils/domainTrust.js` | Trust tier classification (T1–T4). `DOMAIN_REGISTRY` (~40 entries), `classifyDomain()`, `isOEMDomain()`, `isTruckCommunity()`. |
| `src/utils/researchModels.js` | Normalized data models: `createResearchResult()`, `createResearchPacket()`, `finalizePacket()`, `createVendorListing()`, `createServiceResult()`. |
| `src/utils/queryBuilder.js` | CSE query construction + verified `OEM_PORTALS` (12 OEMs), `PARTS_VENDOR_PORTALS` (8 vendors), `LOCAL_SUPPLY_PORTALS` (4 chains). `buildQuery()`, `resolveOEMLinks()`, `getTrustedVendorLinks()`, `getLocalSupplyLinks()`. |
| `src/utils/linkVerification.js` | URL verification: `isConstructedUrl()`, `isValidUrl()`, `annotateLink()`, `annotateLinks()`. |
| `api/research-search.js` | Unified multi-CSE backend. `MODE_TO_CX` mapping routes `forums`/`official_dealer`/`trusted_parts`/`local_supply` to the correct CSE engine. JWT auth, graceful degradation. |
| `api/local-supply-search.js` | Google Places API (New) Text Search for nearby parts stores. JWT auth, Haversine distance sort. |
| `src/services/researchService.js` | Frontend entry point: `searchForums()`, `searchOfficialLinks()`, `searchTrustedParts()`, `searchLocalSupply()`, `getIssueResearchPacket()`, `getVerifiedPartsLinks()`, `formatResearchContext()`, `formatForumContext()`. |
| `src/services/localSupplyService.js` | Client for `/api/local-supply-search`: `searchLocalSupplyStores()` returning `{ stores, storeLocators, error }`. |

## Files Modified

| File | Change |
|------|--------|
| `src/config/env.js` | Added 4 CSE engine env vars: `GOOGLE_CSE_FORUM_CX`, `GOOGLE_CSE_OFFICIAL_CX`, `GOOGLE_CSE_TRUSTED_PARTS_CX`, `GOOGLE_CSE_LOCAL_SUPPLY_CX`. |
| `api/forum-search.js` | `GOOGLE_CSE_FORUM_CX || GOOGLE_CSE_ID` fallback for backward compat. |
| `src/services/forumSearchService.js` | Thin wrapper that delegates to `researchService.searchForums()`. |

## Trust Tier System

| Tier | Label | Examples |
|------|-------|----------|
| 1 | Verified Official | freightliner.com, cummins.com, dtnaparts.com |
| 2 | Authorized Dealer | fleetpride.com, truckpro.com, finditparts.com |
| 3 | Community/Forum | thetruckersreport.com, reddit.com/r/Truckers |
| 4 | General/Marketplace | ebay.com, amazon.com, google.com/shopping |

## Key Design Decisions

- **No guessed search URLs**: OEM portals link to verified landing pages only. Marketplace search URLs (eBay, Amazon) are allowed because their URL patterns are stable public APIs.
- **Mode-based CSE routing**: A single `/api/research-search` endpoint handles all 4 CSE engines via the `mode` parameter, reducing API surface area.
- **Graceful degradation**: If a CSE engine is not configured, the backend returns an empty result set rather than failing.
