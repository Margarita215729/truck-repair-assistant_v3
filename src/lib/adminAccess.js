export const ADMIN_ROLES = new Set(['admin', 'marketing_analyst']);

export function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}
