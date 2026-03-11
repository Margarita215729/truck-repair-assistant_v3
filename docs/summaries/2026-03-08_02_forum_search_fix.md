# 02 — Forum Search Fix

**Date:** 2026-03-08  
**Phase:** 1 (sub-task) — Forum Search Service Refactor

---

## Overview

The existing `forumSearchService.js` called a generic Google CSE endpoint. After introducing the dedicated `GOOGLE_CSE_FORUM_CX` engine and the `researchService`, the forum search was refactored to delegate through the unified research pipeline while preserving backward compatibility.

## Files Modified

| File | Change |
|------|--------|
| `api/forum-search.js` | CSE ID resolution: `process.env.GOOGLE_CSE_FORUM_CX \|\| process.env.GOOGLE_CSE_ID`. Ensures existing deployments continue working while new deployments use the dedicated forum engine. |
| `src/services/forumSearchService.js` | Refactored to a thin wrapper around `researchService.searchForums()`. All callers see the same return shape; no breaking changes. |

## Backward Compatibility

- Any component that imports `forumSearchService.searchForumPosts()` continues to work unchanged.
- The return shape `{ results, totalResults, searchQuery }` is preserved.
- If `GOOGLE_CSE_FORUM_CX` is not set, falls back to `GOOGLE_CSE_ID` automatically.
