/**
 * Smart Horizon GCS — Production Security & Operational Audit Log Viewer
 * Subsystem: Security & Governance (Phase 13)
 */

import React, { useState, useEffect } from 'react';
import { wsClient } from '../communication/WebSocketClient';
import { useAuthStore } from './authStore';
import { ShieldCheck, Search, Filter, RefreshCw, X, AlertTriangle, Clock } from 'lucide-react';

export const AuditViewModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { role } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [filterUser, setFilterUser] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAuditLogs = () => {
    setIsLoading(true);
    wsClient.sendEnvelope('security.get_audit_log', {
      username: filterUser || undefined,
      severity: filterSeverity !== 'ALL' ? filterSeverity : undefined,
      search: searchText || undefined,
      limit: 100,
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditLogs();
    }
  }, [isOpen, filterSeverity]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none">
      <div className="bg-[#11171E] border border-[#2B3743] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col text-[#E7EBEF] p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2B3743] pb-2.5">
          <div className="flex items-center space-x-2 text-[#E7EBEF] font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-[#5B8FB9]" />
            <span>AUTHORITATIVE SECURITY & OPERATIONAL COMMAND AUDIT LOG</span>
          </div>
          <button onClick={onClose} className="p-1 text-[#707C88] hover:text-[#E7EBEF] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex items-center space-x-2 text-xs bg-[#151D26] p-2 rounded-lg border border-[#2B3743]">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-[#707C88] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search command, drone, or user..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded pl-8 pr-3 py-1.5 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-[#707C88]" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1.5 text-[#E7EBEF] text-xs focus:outline-none"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="EMERGENCY">EMERGENCY</option>
            </select>
          </div>

          <button
            onClick={fetchAuditLogs}
            className="px-3 py-1.5 rounded bg-[#1B2530] border border-[#5B8FB9] hover:bg-[#202B36] text-[#E7EBEF] text-xs font-bold flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>

        {/* Audit Records Table */}
        <div className="flex-1 overflow-y-auto border border-[#2B3743] rounded-lg bg-[#0B0F14] text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#151D26] text-[#707C88] sticky top-0 border-b border-[#2B3743]">
              <tr>
                <th className="p-2">TIME</th>
                <th className="p-2">OPERATOR</th>
                <th className="p-2">ROLE</th>
                <th className="p-2">COMMAND</th>
                <th className="p-2">TARGET</th>
                <th className="p-2">AUTH RESULT</th>
                <th className="p-2">EXEC RESULT</th>
                <th className="p-2">SEVERITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3743] font-mono">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#707C88]">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-[#151D26] transition">
                    <td className="p-2 text-[#707C88] whitespace-nowrap">
                      {new Date(rec.timestamp * 1000).toLocaleTimeString()}
                    </td>
                    <td className="p-2 font-bold text-[#E7EBEF]">{rec.username}</td>
                    <td className="p-2 text-[#A9B3BD]">{rec.role}</td>
                    <td className="p-2 text-[#5B8FB9] font-bold">{rec.command_type}</td>
                    <td className="p-2 text-[#A9B3BD]">{rec.target_drone || '—'}</td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          rec.authorization_result === 'AUTHORIZED'
                            ? 'bg-[#151D26] text-[#4F9A72]'
                            : 'bg-[#151D26] text-[#C75A5A]'
                        }`}
                      >
                        {rec.authorization_result}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          rec.execution_result === 'ACCEPTED' || rec.execution_result === 'SUCCESS'
                            ? 'bg-[#151D26] text-[#4F9A72]'
                            : rec.execution_result === 'FAILED'
                            ? 'bg-[#151D26] text-[#C49A4A]'
                            : 'bg-[#151D26] text-[#C75A5A]'
                        }`}
                      >
                        {rec.execution_result}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          rec.severity === 'EMERGENCY'
                            ? 'bg-[#151D26] text-[#C75A5A] animate-pulse'
                            : rec.severity === 'CRITICAL'
                            ? 'bg-[#151D26] text-[#C49A4A]'
                            : 'bg-[#151D26] text-[#A9B3BD]'
                        }`}
                      >
                        {rec.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
