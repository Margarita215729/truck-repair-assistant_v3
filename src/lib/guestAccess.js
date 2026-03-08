/**
 * Guest Access Configuration
 *
 * PUBLIC routes: /, /Diagnostics, /Pricing, /Policies, /auth/confirm
 * PROTECTED routes: /Reports, /Profile, /Community, /PartsCatalog, /ServiceFinder
 *
 * Guest message limit: enforced in Diagnostics sendMessage handler (max 5 total messages)
 * Guest video block: enforced in VisualDiagnostics (recording + upload rejected)
 * Guest telematics lock: enforced in ScanTruckButton + inline scan handler
 * Guest history: ChatHistory panel hidden; conversation persistence skipped
 */

export const GUEST_CHAT_MESSAGE_LIMIT = 5;

export const isGuestUser = (isAuthenticated) => !isAuthenticated;

export const canGuestUseVideo = false;

export const canGuestUseTelematicsScan = false;

/** Routes accessible without authentication */
export const PUBLIC_ROUTES = ['/', '/Diagnostics', '/Pricing', '/Policies', '/auth/confirm'];

/** Check if a route path is public */
export const isPublicRoute = (path) =>
  PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
