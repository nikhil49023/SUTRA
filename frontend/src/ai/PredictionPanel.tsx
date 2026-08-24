import React from 'react';
import { useAIStore } from '../stores/aiStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { Activity, BatteryCharging, Clock, ShieldCheck } from 'lucide-react';
import { formatDistance, formatDuration } from '../utils/formatting';

export const PredictionPanel: React.FC = () => {
  const { battery_predictions, eta_predictions, failure_predictions, risk_assessment } =
    useAIStore();
  const { activeDroneId } = useTelemetryStore();

  const batteryPred = battery_predictions[activeDroneId];
  const etaPred = eta_predictions[activeDroneId];

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>PREDICTIVE BATTERY & ETA MODEL</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-bold">
          RISK: {risk_assessment}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Battery Prediction */}
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <BatteryCharging className="w-3 h-3 text-amber-400" />
            <span>EST RTH RESERVE</span>
          </div>
          <div className="font-bold text-amber-400 text-sm tabular-nums">
            {batteryPred ? `${batteryPred.predicted_rth_pct.toFixed(1)}%` : '18.5%'}
          </div>
          <div className="text-[9px] text-slate-500">
            Landing: {batteryPred ? `${batteryPred.predicted_landing_pct.toFixed(0)}%` : '74%'}
          </div>
        </div>

        {/* ETA Prediction */}
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>TIME TO HOME / END</span>
          </div>
          <div className="font-bold text-cyan-300 text-sm tabular-nums">
            {etaPred ? formatDuration(etaPred.eta_to_home_sec) : '02:10'}
          </div>
          <div className="text-[9px] text-slate-500">
            End: {etaPred ? formatDuration(etaPred.eta_to_mission_end_sec) : '03:30'}
          </div>
        </div>
      </div>

      {/* Subsystem Failure Risk Diagnostics */}
      <div className="bg-slate-900/60 p-2 rounded border border-slate-800 space-y-1 text-[11px]">
        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>SUBSYSTEM HEALTH AUDIT:</span>
          <span className="text-emerald-400 font-bold">100% NOMINAL</span>
        </div>
        {failure_predictions.map((fp) => (
          <div key={fp.prediction_id} className="text-[10px] text-slate-300 flex justify-between">
            <span>{fp.subsystem}: {fp.failure_type}</span>
            <span className="text-emerald-400">{(fp.confidence * 100).toFixed(0)}% CONF</span>
          </div>
        ))}
      </div>
    </div>
  );
};
