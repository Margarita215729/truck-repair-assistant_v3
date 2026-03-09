# Shared Research / Retrieval Layer Upgrade

> **Scope**: Cross-cutting backend + frontend retrieval architecture for diagnostics research, forum/community evidence, OEM/dealer/authorized link resolution, parts sourcing research, and service discovery enrichment.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                     React Components (consumers)                      │
│  Diagnostics.jsx │ PartDetailModal.jsx │ PartCard.jsx │ ServiceFinder │
└─────────┬──────────────────┬──────────────────┬─────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│              researchService.js (frontend entry point)                │
│  searchForums() │ resolveOfficialLinks() │ getIssueResearchPacket()  │
│  getVerifiedPartsLinks() │ searchDealerLinks() │ formatForumContext() │
└─────────┬──────────────────┬──────────────────┬─────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌──────────────────┐ ┌────────────────────────────┐
│ queryBuilder.js │ │ researchModels.js│ │  linkVerification.js       │
│ Build queries   │ │ Normalize results│ │  Detect constructed URLs   │
│ OEM_LINKS data  │ │ Research packets │ │  Verify live links         │
└─────────────────┘ └──────────────────┘ └────────────────────────────┘
          │                  │                                │
          └──────────┬───────┘                                │
                     ▼                                        │
          ┌──────────────────┐                                │
          │  domainTrust.js  │ ◄──────────────────────────────┘
          │  Trust tiers 1-4 │
          │  Source classes   │
          │  Domain registry  │
          └──────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│               api/research-search.js (Vercel serverless)             │
│  Google CSE search │ OEM link resolution │ Batch link verification   │
│  JWT auth (fixed) │ Graceful degradation │ Source classification     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/utils/domainTrust.js` | Trust tier policy, source class taxonomy, domain registry with regex classification | ~150 |
| `src/utils/researchModels.js` | ResearchResult, ResolvedLink, ResearchPacket factories; normalizers for all result types | ~270 |
| `src/utils/queryBuilder.js` | Query builders for 6 search modes; OEM_LINKS with verified portal URLs; vendor link builder | ~290 |
| `src/utils/linkVerification.js` | `isConstructedUrl()` detector, batch API verification, URL structure validation | ~120 |
| `api/research-search.js` | Unified serverless endpoint: search (6 modes) + verify_links; JWT auth; Google CSE | ~370 |
| `src/services/researchService.js` | Frontend service: API client, auth helper, caching, all public search methods | ~260 |

**Total new code**: ~1,460 lines

## Files Modified

| File | Change |
|------|--------|
| `src/services/forumSearchService.js` | Replaced with thin wrapper that delegates to `researchService` (backward-compatible) |
| `src/pages/Diagnostics.jsx` | Added OEM official links resolution in parallel; injected verified links into AI prompt; added `officialLinks` source tag |
| `src/components/parts/PartDetailModal.jsx` | Added "Verified OEM Resources" and "Verified Vendor Links" sections above legacy search URLs; added constructed-URL warning badges |
| `src/components/parts/PartCard.jsx` | Added constructed-URL visual indicator (yellow tint) on guessed OEM search links |
| `src/pages/ServiceFinder.jsx` | Added truck context + OEM dealer locator links panel above service results |

---

## Key Design Decisions

### 1. Trust Tier System (4 tiers)
| Tier | Label | Examples |
|------|-------|----------|
| 1 | Verified Official | OEM parts portals, manufacturer recall lookups |
| 2 | Authorized Dealer/Specialist | FleetPride, TruckPro, FinditParts |
| 3 | Community/Editorial | TruckersReport, TheDiselStop, Reddit |
| 4 | General Web | Google Shopping, eBay, Amazon |

### 2. Source Class Taxonomy (13 classes)
`oem_manufacturer`, `oem_parts_portal`, `authorized_dealer`, `specialty_vendor`, `aftermarket_vendor`, `marketplace`, `forum_community`, `reddit_community`, `knowledge_base`, `government_recall`, `industry_publication`, `video_tutorial`, `news_article`

### 3. Search Modes (6)
- `forums` — Truck repair forum discussions via Google CSE
- `official_links` — OEM portal/dealer locator resolution
- `dealers` — Authorized dealer + service center links
- `parts_sources` — Verified parts vendor links
- `services` — Service discovery enrichment
- `issue_research` — Combined mode for diagnostics (forums + links + parts)

### 4. OEM Links: Verified Portals, Not Guessed Search URLs
**Before**: Fabricated URLs like `https://parts.freightliner.com/search?q=...` (likely 404)
**After**: Verified portal entry points:
| Manufacturer | Parts Portal | Dealer Locator | Tech Docs |
|---|---|---|---|
| Freightliner | `parts.dtna.com` | `freightliner.com/dealer-locator` | `dtna.com/support` |
| Peterbilt | `paccartparts.com` | `peterbilt.com/dealers` | `peterbilt.com/support` |
| Kenworth | `paccartparts.com` | `kenworth.com/dealer-locator` | `kenworth.com/support` |
| Volvo | `volvotrucks.us/parts` | `volvotrucks.us/dealer-locator` | `volvotrucks.us/support` |
| Mack | `macktrucks.com/parts` | `macktrucks.com/dealer-locator` | `macktrucks.com/support` |
| International | `internationaltrucks.com/parts` | `internationaltrucks.com/dealer-locator` | — |
| Western Star | `westernstartrucks.com/parts` | `westernstartrucks.com/dealer-locator` | — |
| Cummins | `quickserve.cummins.com` | `cummins.com/find-a-location` | `quickserve.cummins.com` |

### 5. Auth Bug Fix
**Before**: `forumSearchService.js` never sent `Authorization` header → always 401 in production
**After**: `researchService.js` extracts JWT from `supabase.auth.getSession()` and sends `Bearer` token on every request

### 6. Constructed URL Detection
`isConstructedUrl(url)` detects guessed OEM search patterns (e.g., `parts.freightliner.com/search?q=`) and returns `true`, enabling UI to show a warning badge. This doesn't block the link — just informs the user it may not work.

---

## Integration Points

### Diagnostics Page
- Forum search now goes through authenticated research layer (auth bug fixed)
- OEM official links resolved in parallel with forum search + telematics
- Verified manufacturer links injected into AI prompt context
- `_sources.officialLinks` tag added for trust-level attribution

### Parts Detail Modal
- New "Verified OEM Resources" section (Tier 1 — green badge) shows manufacturer portals
- New "Verified Vendor Links" section shows only vendors with confirmed working search endpoints
- Legacy "Search on vendor sites" section now shows warning icon on constructed URLs

### Parts Card
- Inline vendor search links now show yellow tint when URL is a guessed construction

### Service Finder
- OEM dealer locator links shown in a compact panel when truck make is known
- Links to official manufacturer dealer finders (not fabricated search URLs)

---

## Graceful Degradation

Every function in the chain follows "never throw, always degrade":

1. **API unreachable** → Client-side OEM links returned from local registry (zero network)
2. **Auth fails** → Request proceeds without token; API returns 401; client returns empty results
3. **Google CSE timeout** → Empty forum results, other modes still work
4. **Link verification fails** → Links returned without verification status
5. **No truck make** → OEM sections hidden; generic vendor links still shown
