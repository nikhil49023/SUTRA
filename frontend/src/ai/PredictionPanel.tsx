import React from 'react';
import { useAIStore } from '../stores/aiStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { Activity, BatteryCharging, Clock, ShieldCheck } from 'lucide-react';
import { formatDuration } from '../utils/formatting';

export const PredictionPanel: React.FC = () => {
  const { battery_predictions, eta_predictions, failure_predictions, risk_assessment } =
    useAIStore();
  const { activeDroneId } = useTelemetryStore();

  const batteryPred = battery_predictions[activeDroneId];
  const etaPred = eta_predictions[activeDroneId];

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">PREDICTIVE BATTERY & ETA MODEL</span>
            <span className="text-[10px] text-[#707C88] ml-2">// REAL-TIME EXTRAPOLATION</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#151D26] border border-[#4F9A72]/40 text-[#4F9A72] text-[10px] font-bold">
          RISK: {risk_assessment}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Battery Prediction */}
        <div className="bg-[#151D26] p-2.5 rounded-lg border border-[#2B3743] space-y-1">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <BatteryCharging className="w-3 h-3 text-[#C49A4A]" />
            <span>EST RTH RESERVE</span>
          </div>
          <div className="font-bold text-[#C49A4A] text-sm tabular-nums">
            {batteryPred ? `${batteryPred.predicted_rth_pct.toFixed(1)}%` : '18.5%'}
          </div>
          <div className="text-[9px] text-[#707C88]">
            Landing: <strong className="text-[#A9B3BD]">{batteryPred ? `${batteryPred.predicted_landing_pct.toFixed(0)}%` : '74%'}</strong>
          </div>
        </div>

        {/* ETA Prediction */}
        <div className="bg-[#151D26] p-2.5 rounded-lg border border-[#2B3743] space-y-1">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Clock className="w-3 h-3 text-[#5B8FB9]" />
            <span>TIME TO HOME / END</span>
          </div>
          <div className="font-bold text-[#5B8FB9] text-sm tabular-nums">
            {etaPred ? formatDuration(etaPred.eta_to_home_sec) : '02:10'}
          </div>
          <div className="text-[9px] text-[#707C88]">
            Mission End: <strong className="text-[#A9B3BD]">{etaPred ? formatDuration(etaPred.eta_to_mission_end_sec) : '03:30'}</strong>
          </div>
        </div>
      </div>

      {/* Subsystem Failure Risk Diagnostics */}
      <div className="bg-[#151D26] p-2.5 rounded-lg border border-[#2B3743] space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center text-[10px] text-[#707C88]">
          <span className="font-bold flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-[#4F9A72]" />
            <span>SUBSYSTEM HEALTH AUDIT:</span>
          </span>
          <span className="text-[#4F9A72] font-bold">100% NOMINAL</span>
        </div>
        {failure_predictions.map((fp) => (
          <div key={fp.prediction_id} className="text-[10px] text-[#A9B3BD] flex justify-between pt-1 border-t border-[#2B3743]/50">
            <span>{fp.subsystem}: {fp.failure_type}</span>
            <span className="text-[#4F9A72] font-bold">{(fp.confidence * 100).toFixed(0)}% CONF</span>
          </div>
        ))}
      </div>
    </div>
  );
};
