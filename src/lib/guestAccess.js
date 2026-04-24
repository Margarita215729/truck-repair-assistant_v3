/**
 * Guest Access Configuration
 *
 * PUBLIC routes: /, /Diagnostics, /Pricing, /Policies, /auth/confirm, /PartsCatalog, /ServiceFinder, /Community
 * PROTECTED routes: /Reports, /Profile
 *
 * Guest message limit: enforced in Diagnostics sendMessage handler (max 10 total messages)
 * Guest video block: enforced in VisualDiagnostics (recording + upload rejected)
 * Guest telematics lock: enforced in ScanTruckButton + inline scan handler
 * Guest history: ChatHistory panel hidden; conversation persistence skipped
 */

export const GUEST_CHAT_MESSAGE_LIMIT = 10;

export const isGuestUser = (isAuthenticated) => !isAuthenticated;

export const canGuestUseVideo = false;

export const canGuestUseTelematicsScan = false;

/** Routes accessible without authentication */
export const PUBLIC_ROUTES = ['/', '/Diagnostics', '/Pricing', '/Policies', '/auth/confirm', '/PartsCatalog', '/ServiceFinder', '/Community'];

/** Check if a route path is public */
export const isPublicRoute = (path) =>
  PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
