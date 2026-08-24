/**
 * Smart Horizon GCS — Permission Hooks & Verification Matrix
 * Subsystem: Security & Governance (Phase 13)
 */

import { useAuthStore } from './authStore';

export const usePermission = (permission: string): boolean => {
  const { role, permissions, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return false;
  if (role === 'ADMIN' || role === 'COMMANDER') return true;
  return permissions.includes(permission);
};

export const useHasRole = (allowedRoles: string | string[]): boolean => {
  const { role, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return false;
  if (role === 'ADMIN') return true;
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(role);
};

export const checkPermission = (userPerms: string[], role: string, requiredPerm: string): boolean => {
  if (role === 'ADMIN' || role === 'COMMANDER') return true;
  return userPerms.includes(requiredPerm);
};
