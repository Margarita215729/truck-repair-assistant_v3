# 03 — Vendor/Parts OEM URL Cleanup

**Date:** 2026-03-08  
**Phase:** 3 — Vendor Service Rebuild + Consumer Components

---

## Overview

Replaced guessed OEM search URLs (e.g. `https://parts.freightliner.com/search?q=...`) with verified portal landing pages. Added annotated link metadata so every component can show trust indicators (✓ Verified, shield icons) to users.

## vendorService.js Rebuild

### Before
- `getSearchUrls()` constructed `/search?q=partNumber` URLs for OEM sites — URLs that may not exist.
- Consumers used `VENDOR_INFO[key]` directly, with no trust differentiation.

### After
- `getSearchUrls()` returns verified portal landing pages from `OEM_PORTALS` for OEMs, homepage links for specialist vendors, marketplace search URLs only for eBay/Google Shopping/Amazon.
- **New:** `getAnnotatedSearchLinks(partNumber, partName, make)` returns enriched `[{ key, url, label, icon, isVerified, isConstructed, trustTier }]`.
- **New:** `getVendorDisplayInfo(key)` handles both static VENDOR_INFO keys and dynamic OEM keys.
- `VENDOR_INFO` expanded with `internationalParts` and `cumminsParts`.

## Consumer Components Updated

| Component | Before | After |
|-----------|--------|-------|
| `PartDetailModal.jsx` | `Object.entries(searchUrls)` + `VENDOR_INFO[key]` | `getAnnotatedSearchLinks()` + "Verified portal" label |
| `PartCard.jsx` | `Object.entries(vendorPrices.searchUrls)` + `VENDOR_INFO[key]` | `getAnnotatedSearchLinks()` + `✓` prefix for verified |
| `SuggestedParts.jsx` | `Object.entries(urls)` + `VENDOR_INFO[key]` | `getAnnotatedSearchLinks()` + `getVendorDisplayInfo()` + green ✓ |
| `PartsCatalog.jsx` | `renderSearchUrls()` with `VENDOR_INFO[key]` | `getVendorDisplayInfo()` + `ShieldCheck` icon for tier-1 OEM |
| `ComparePartsModal.jsx` | `VENDOR_INFO[key]` + `getSearchUrls()` | `getAnnotatedSearchLinks()` + `getVendorDisplayInfo()` + ✓ |

## Verification

- `grep -rn "VENDOR_INFO" src/ --include="*.jsx"` returns **zero** matches outside `vendorService.js` itself.
- Build: `✓ built in 4.25s` — no errors.
