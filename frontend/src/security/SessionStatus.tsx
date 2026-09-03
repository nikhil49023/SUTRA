/**
 * Smart Horizon GCS — Tactical Operator & Security Status HUD
 * Subsystem: Security & Governance (Phase 13)
 */

import React, { useState } from 'react';
import { useAuthStore } from './authStore';
import { authClient } from './authClient';
import { Shield, ShieldAlert, User, LogOut, Key, CheckCircle, AlertTriangle, X } from 'lucide-react';

export const SessionStatus: React.FC = () => {
  const { user, role, isAuthenticated, sessionStatus, lastAuthError } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('commander');
  const [password, setPassword] = useState('Commander@GCS2026!');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await authClient.login(username, password);
    setIsLoading(false);
    if (success) {
      setShowLoginModal(false);
    }
  };

  const getRoleBadgeColor = (r: string) => {
    switch (r) {
      case 'COMMANDER':
        return 'bg-[#1B2530] border-[#C49A4A] text-[#C49A4A] ring-1 ring-[#C49A4A]/40';
      case 'PILOT':
        return 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9]';
      case 'MISSION_PLANNER':
        return 'bg-[#151D26] border-[#5B8FB9] text-[#E7EBEF]';
      case 'OPERATOR':
        return 'bg-[#151D26] border-[#4F9A72] text-[#4F9A72]';
      case 'ADMIN':
        return 'bg-[#151D26] border-[#C75A5A] text-[#C75A5A] ring-1 ring-[#C75A5A]/40';
      default:
        return 'bg-[#11171E] border-[#2B3743] text-[#707C88]';
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2 font-mono text-xs select-none">
        {/* Security Indicator Pill */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="flex items-center space-x-1.5 px-2 py-1 bg-[#11171E] border border-[#2B3743] hover:border-[#5B8FB9] rounded-md transition shadow-inner group"
          title="Click to Switch Operator or View Security Details"
        >
          <Shield className={`w-3.5 h-3.5 ${isAuthenticated ? 'text-[#5B8FB9]' : 'text-[#C49A4A]'}`} />
          <div className="flex items-center space-x-1 text-[11px]">
            <span className="text-[#707C88] font-medium">USER:</span>
            <span className="font-bold text-[#E7EBEF]">{user ? user.username.toUpperCase() : 'ANONYMOUS'}</span>
          </div>

          <div className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${getRoleBadgeColor(role)}`}>
            {role}
          </div>

          <div className="w-1.5 h-1.5 rounded-full bg-[#4F9A72] animate-pulse" title="Session Authenticated & Active" />
        </button>
      </div>

      {/* Operator Login / Switch Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
          <div className="bg-[#11171E] border border-[#2B3743] rounded-xl shadow-2xl w-full max-w-md p-5 text-[#E7EBEF] space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2B3743] pb-3">
              <div className="flex items-center space-x-2 text-[#E7EBEF] font-bold text-sm">
                <Key className="w-4 h-4 text-[#5B8FB9]" />
                <span>OPERATOR AUTHENTICATION & ACCESS CONTROL</span>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-[#707C88] hover:text-[#E7EBEF] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Session Summary */}
            <div className="bg-[#151D26] p-3 rounded-lg border border-[#2B3743] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#707C88]">Current Operator:</span>
                <span className="font-bold text-[#E7EBEF]">{user?.display_name || 'Anonymous'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707C88]">Assigned Role:</span>
                <span className={`font-bold px-1.5 rounded ${getRoleBadgeColor(role)}`}>{role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707C88]">Session Status:</span>
                <span className="font-bold text-[#4F9A72]">{sessionStatus}</span>
              </div>
            </div>

            {/* Switch Account Form */}
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div className="text-[11px] font-bold text-[#707C88] border-b border-[#2B3743] pb-1">
                SWITCH TACTICAL OPERATOR ACCOUNT
              </div>

              {lastAuthError && (
                <div className="p-2 rounded bg-[#151D26] border border-[#C75A5A] text-[#C75A5A] flex items-center space-x-2 text-[11px]">
                  <ShieldAlert className="w-4 h-4 text-[#C75A5A] shrink-0" />
                  <span>{lastAuthError}</span>
                </div>
              )}

              <div>
                <label className="block text-[#707C88] mb-1 text-[11px]">Operator Username</label>
                <select
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (e.target.value === 'commander') setPassword('Commander@GCS2026!');
                    if (e.target.value === 'pilot') setPassword('Pilot@GCS2026!');
                    if (e.target.value === 'planner') setPassword('Planner@GCS2026!');
                    if (e.target.value === 'operator') setPassword('Operator@GCS2026!');
                    if (e.target.value === 'viewer') setPassword('Viewer@GCS2026!');
                    if (e.target.value === 'admin') setPassword('Admin@GCS2026!');
                  }}
                  className="w-full bg-[#0B0F14] border border-[#2B3743] rounded p-2 text-[#E7EBEF] focus:border-[#5B8FB9] focus:outline-none"
                >
                  <option value="commander">commander (COMMANDER - Full Fleet & Emergency Control)</option>
                  <option value="pilot">pilot (PILOT - Armed Flight Operations & Takeoff)</option>
                  <option value="planner">planner (MISSION_PLANNER - Route & Geofence Design)</option>
                  <option value="operator">operator (OPERATOR - Tactical Telemetry & Simulation)</option>
                  <option value="viewer">viewer (VIEWER - Read-Only Tactical Observation)</option>
                  <option value="admin">admin (ADMIN - Security Audits & Configuration)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#707C88] mb-1 text-[11px]">Secure Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B0F14] border border-[#2B3743] rounded p-2 text-[#E7EBEF] focus:border-[#5B8FB9] focus:outline-none"
                  placeholder="Enter operator password"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-[#1B2530] border border-[#5B8FB9] hover:bg-[#202B36] text-[#E7EBEF] rounded font-bold transition flex items-center justify-center space-x-1.5"
                >
                  <User className="w-3.5 h-3.5 text-[#5B8FB9]" />
                  <span>{isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE & SWITCH'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    authClient.logout();
                    setShowLoginModal(false);
                  }}
                  className="px-3 py-2 bg-[#151D26] border border-[#2B3743] hover:border-[#C75A5A] text-[#707C88] hover:text-[#C75A5A] rounded transition"
                  title="Logout Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
