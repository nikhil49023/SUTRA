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
        return 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500/40';
      case 'PILOT':
        return 'bg-cyan-950/80 border-cyan-500 text-cyan-300';
      case 'MISSION_PLANNER':
        return 'bg-purple-950/80 border-purple-500 text-purple-300';
      case 'OPERATOR':
        return 'bg-emerald-950/80 border-emerald-500 text-emerald-300';
      case 'ADMIN':
        return 'bg-rose-950/80 border-rose-500 text-rose-300 ring-1 ring-rose-500/40';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-400';
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2 font-mono text-xs select-none">
        {/* Security Indicator Pill */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="flex items-center space-x-1.5 px-2 py-1 bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-md transition shadow-inner group"
          title="Click to Switch Operator or View Security Details"
        >
          <Shield className={`w-3.5 h-3.5 ${isAuthenticated ? 'text-cyan-400' : 'text-amber-400'}`} />
          <div className="flex items-center space-x-1 text-[11px]">
            <span className="text-slate-400 font-medium">USER:</span>
            <span className="font-bold text-slate-200">{user ? user.username.toUpperCase() : 'ANONYMOUS'}</span>
          </div>

          <div className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${getRoleBadgeColor(role)}`}>
            {role}
          </div>

          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Session Authenticated & Active" />
        </button>
      </div>

      {/* Operator Login / Switch Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
          <div className="bg-[#090d14] border border-cyan-500/50 rounded-xl shadow-2xl w-full max-w-md p-5 text-slate-200 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Key className="w-4 h-4" />
                <span>OPERATOR AUTHENTICATION & ACCESS CONTROL</span>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Session Summary */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Operator:</span>
                <span className="font-bold text-slate-200">{user?.display_name || 'Anonymous'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Role:</span>
                <span className={`font-bold px-1.5 rounded ${getRoleBadgeColor(role)}`}>{role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Session Status:</span>
                <span className="font-bold text-emerald-400">{sessionStatus}</span>
              </div>
            </div>

            {/* Switch Account Form */}
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div className="text-[11px] font-bold text-slate-400 border-b border-slate-800/80 pb-1">
                SWITCH TACTICAL OPERATOR ACCOUNT
              </div>

              {lastAuthError && (
                <div className="p-2 rounded bg-rose-950/80 border border-rose-500 text-rose-200 flex items-center space-x-2 text-[11px]">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{lastAuthError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Operator Username</label>
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
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-400 focus:outline-none"
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
                <label className="block text-slate-400 mb-1 text-[11px]">Secure Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-400 focus:outline-none"
                  placeholder="Enter operator password"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-cyan-950 border border-cyan-500 hover:bg-cyan-900 text-cyan-200 rounded font-bold transition flex items-center justify-center space-x-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE & SWITCH'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    authClient.logout();
                    setShowLoginModal(false);
                  }}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 hover:bg-rose-950/60 hover:border-rose-500 text-slate-400 hover:text-rose-200 rounded transition"
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
