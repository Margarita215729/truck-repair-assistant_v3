/**
 * Forum Search Service
 * Searches curated truck repair forums via Google Custom Search API
 * through the /api/forum-search Vercel serverless endpoint.
 *
 * Designed for non-blocking integration: 3s timeout, silent failure.
 */

const FORUM_SEARCH_TIMEOUT = 3000; // 3 seconds max

/**
 * Build a search query from diagnostic context
 * @param {Object} params
 * @param {string} [params.truckMake]
 * @param {string} [params.truckModel]
 * @param {string} [params.truckYear]
 * @param {string[]} [params.errorCodes]
 * @param {string[]} [params.symptoms]
 * @param {string} [params.freeText]
 * @returns {string}
 */
function buildForumQuery({ truckMake, truckModel, truckYear, errorCodes = [], symptoms = [], freeText = '' }) {
  const parts = [];

  // Truck identity
  if (truckMake) parts.push(truckMake);
  if (truckModel) parts.push(truckModel);
  if (truckYear) parts.push(truckYear);

  // Error codes (most specific — prioritize)
  if (errorCodes.length > 0) {
    parts.push(errorCodes.slice(0, 3).join(' ')); // max 3 codes to keep query focused
  }

  // Symptoms (pick most relevant 2)
  if (symptoms.length > 0) {
    parts.push(symptoms.slice(0, 2).join(' '));
  }

  // Free text (truncate to keep query reasonable)
  if (freeText) {
    parts.push(freeText.substring(0, 60));
  }

  // Always add truck repair context
  if (!parts.some(p => /truck|repair|fix|problem/i.test(p))) {
    parts.push('truck repair');
  }

  return parts.join(' ').trim();
}

/**
 * Search truck repair forums for relevant discussions.
 * Returns results array (possibly empty) — never throws.
 *
 * @param {Object} params
 * @param {string} [params.truckMake]
 * @param {string} [params.truckModel]
 * @param {string} [params.truckYear]
 * @param {string[]} [params.errorCodes]
 * @param {string[]} [params.symptoms]
 * @param {string} [params.freeText] - User's message text
 * @param {number} [params.num=5] - Number of results (1-10)
 * @returns {Promise<{results: ForumResult[], query: string, error?: string}>}
 *
 * @typedef {Object} ForumResult
 * @property {string} title
 * @property {string} link
 * @property {string} snippet
 * @property {string} source - e.g., "TruckersReport", "Reddit"
 * @property {string|null} date
 */
export async function searchForums({ truckMake, truckModel, truckYear, errorCodes, symptoms, freeText, num = 5 } = {}) {
  try {
    const query = buildForumQuery({ truckMake, truckModel, truckYear, errorCodes, symptoms, freeText });

    if (!query || query.trim().length < 3) {
      return { results: [], query: '', error: 'Query too short' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FORUM_SEARCH_TIMEOUT);

    const response = await fetch('/api/forum-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, num }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('Forum search HTTP error:', response.status);
      return { results: [], query, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      results: data.results || [],
      query: data.query || query,
      error: data.error || null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('Forum search timed out (3s limit)');
      return { results: [], query: '', error: 'Timeout' };
    }
    console.warn('Forum search failed:', err.message);
    return { results: [], query: '', error: err.message };
  }
}

/**
 * Format forum results into context text for the AI prompt.
 * @param {ForumResult[]} results
 * @returns {string} Formatted context block, or empty string if no results
 */
export function formatForumContext(results) {
  if (!results || results.length === 0) return '';

  let context = `\n\n🌐 REAL FORUM DISCUSSIONS (from verified sources — cite these URLs when referencing):\n`;
  results.forEach((r, i) => {
    context += `\n${i + 1}. "${r.title}"`;
    context += `\n   Source: ${r.source}`;
    context += `\n   URL: ${r.link}`;
    if (r.date) context += `\n   Date: ${r.date}`;
    context += `\n   Snippet: ${r.snippet}`;
    context += '\n';
  });

  return context;
}
