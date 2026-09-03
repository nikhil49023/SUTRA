import React, { useState } from 'react';
import { commandManager } from '../communication/CommandManager';
import { Cloud, Wind, Droplets, Sun, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

export const WeatherPanel: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [weather, setWeather] = useState({
    wind_speed: 4.2,
    wind_dir: 230,
    wind_gusts: 6.5,
    temp_c: 21.5,
    qnh_hpa: 1013.2,
    humidity: 58,
    dew_point: 13.0,
    visibility_km: 10.0,
    risk_level: 'SAFE',
    status: 'VMC (FLIGHT ENVELOPE SAFE)',
  });

  const handleSyncWeather = async () => {
    setIsSyncing(true);
    try {
      const resp = await commandManager.sendCommandAsync('gis.run_weather', {
        wind_speed: weather.wind_speed,
        wind_gusts: weather.wind_gusts,
        visibility_km: weather.visibility_km,
        precip_mm: 0.0,
      });
      if (resp && resp.result) {
        const p = resp.result;
        setWeather((w) => ({
          ...w,
          risk_level: p.risk_level || 'SAFE',
          status: p.risk_level === 'SAFE' ? 'VMC (FLIGHT ENVELOPE SAFE)' : 'IMC (WEATHER WARNING ACTIVE)',
        }));
      }
    } catch (e) {
      console.warn('Weather sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Cloud className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">TACTICAL METEOROLOGICAL CONDITIONS</span>
            <span className="text-[10px] text-[#707C88] ml-2">// ENVIRONMENTAL SENSORS</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
            weather.risk_level === 'SAFE'
              ? 'bg-[#151D26] border-[#4F9A72]/40 text-[#4F9A72]'
              : 'bg-[#151D26] border-[#C75A5A]/40 text-[#C75A5A]'
          }`}>
            {weather.status}
          </span>
          <button
            onClick={handleSyncWeather}
            disabled={isSyncing}
            className="px-2 py-0.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>SYNC METAR</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Wind className="w-3 h-3 text-[#5B8FB9]" />
            <span>WIND SPEED & DIR</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            {weather.wind_speed.toFixed(1)} m/s @ {weather.wind_dir}° (SW)
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Sun className="w-3 h-3 text-[#C49A4A]" />
            <span>TEMPERATURE / QNH</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            {weather.temp_c.toFixed(1)}°C · {weather.qnh_hpa.toFixed(1)} hPa
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Droplets className="w-3 h-3 text-[#5B8FB9]" />
            <span>HUMIDITY / DEW</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            {weather.humidity}% · {weather.dew_point.toFixed(1)}°C
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Cloud className="w-3 h-3 text-[#707C88]" />
            <span>CEILING / VISIBILITY</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            UNLIMITED · &gt; {weather.visibility_km.toFixed(0)} km
          </div>
        </div>
      </div>
    </div>
  );
};
