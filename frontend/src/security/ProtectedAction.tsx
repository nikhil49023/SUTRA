/**
 * Smart Horizon GCS — Permission-Aware Action Wrapper Component
 * Subsystem: Security & Governance (Phase 13)
 */

import React from 'react';
import { usePermission } from './permissionStore';
import { ShieldAlert } from 'lucide-react';

interface ProtectedActionProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabledTooltip?: string;
  hideIfDenied?: boolean;
}

export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  permission,
  children,
  fallback,
  disabledTooltip = 'Insufficient permissions for this action',
  hideIfDenied = false,
}) => {
  const isAllowed = usePermission(permission);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (hideIfDenied) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative group inline-block cursor-not-allowed">
      <div className="opacity-40 pointer-events-none filter grayscale">{children}</div>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center space-x-1 px-2 py-1 bg-rose-950/95 border border-rose-500/60 rounded text-[10px] font-mono text-rose-200 shadow-xl whitespace-nowrap z-50 pointer-events-none backdrop-blur-md">
        <ShieldAlert className="w-3 h-3 text-rose-400" />
        <span>{disabledTooltip}</span>
      </div>
    </div>
  );
};
