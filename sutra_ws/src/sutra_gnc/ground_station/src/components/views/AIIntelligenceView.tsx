import React, { useState } from 'react';
import { 
  Cpu, 
  Target, 
  ShieldAlert, 
  Flame, 
  Search, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  CheckCircle2, 
  Crosshair, 
  Clock, 
  Layers, 
  Zap, 
  Radio, 
  Sliders, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useAIStore } from '../../services/aiStore';

export const AIIntelligenceView: React.FC = () => {
  const { 
    detections, 
    trackedTargetId, 
    recommendations, 
    messages, 
    isHeatmapEnabled, 
    setIsHeatmapEnabled, 
    sendNaturalLanguageQuery, 
    lockTarget, 
    dismissRecommendation 
  } = useAIStore();

  const [inputQuery, setInputQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'DETECTIONS' | 'RECOMMENDATIONS' | 'ASSISTANT'>('DETECTIONS');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    sendNaturalLanguageQuery(inputQuery);
    setInputQuery('');
  };

  return (
    <div className="flex-1 h-full bg-[#070a11] hud-grid flex flex-col overflow-y-auto p-3 space-y-3 z-10 text-xs font-mono select-none">
      {/* TOP AI SYSTEM HEADER */}
      <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <div className="font-bold text-slate-100 uppercase text-xs flex items-center gap-2">
              <span>AI INTELLIGENCE & COMPUTER VISION MATRIX</span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.5 rounded font-mono">
                YOLOv8 + PyTorch Engine ONLINE
              </span>
            </div>
            <div className="text-[10px] text-slate-400">FASTAPI NEURAL INFERENCE PIPELINE (50FPS MULTI-OBJECT TRACKER)</div>
          </div>
        </div>

        {/* TOP CONTROLS & HEATMAP TOGGLE */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsHeatmapEnabled(!isHeatmapEnabled)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
              isHeatmapEnabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-[#090d16] text-slate-400 border border-[#1a2336]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>THERMAL HEATMAP: {isHeatmapEnabled ? 'ACTIVE' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* MAIN 3-COLUMN AI DASHBOARD */}
      <div className="grid grid-cols-12 gap-3 flex-1">
        {/* COLUMN 1: OBJECT DETECTIONS & TRACKING (5 COLS) */}
        <div className="col-span-5 bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col space-y-2">
          <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold uppercase text-slate-200 text-xs">DETECTED TARGETS ({detections.length})</h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">100Hz INFERENCE</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] pr-1">
            {detections.map((det) => {
              const isTracked = trackedTargetId === det.id;
              return (
                <div
                  key={det.id}
                  className={`p-2.5 rounded border transition-all ${
                    isTracked
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                      : 'bg-[#080d16] border-[#1a2336] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        det.threatLevel === 'CRITICAL' ? 'bg-rose-500 animate-ping' :
                        det.threatLevel === 'HIGH' ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'
                      }`}></span>
                      <span className="font-bold text-slate-100 text-xs">{det.class}</span>
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      det.threatLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      det.threatLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}>
                      {det.threatLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 bg-[#060a12] p-1.5 rounded my-1">
                    <div>
                      <span>Confidence:</span> <span className="text-emerald-400 font-bold">{det.confidence}%</span>
                    </div>
                    <div>
                      <span>Sensor:</span> <span className="text-cyan-300 font-bold">{det.sensorSource}</span>
                    </div>
                    <div className="col-span-2">
                      <span>Coordinates:</span> <span className="text-slate-200">{det.coordinates.lat} N, {det.coordinates.lng} E</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-slate-500">ID: {det.id} | {det.timestamp}</span>
                    <button
                      onClick={() => lockTarget(det.id)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                        isTracked
                          ? 'bg-amber-500 text-black'
                          : 'bg-[#101726] border border-[#1e293b] text-cyan-400 hover:bg-cyan-500/20'
                      }`}
                    >
                      {isTracked ? 'TRACKING LOCKED' : 'LOCK TARGET'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: AI RECOMMENDATIONS ENGINE (3 COLS) */}
        <div className="col-span-3 bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col space-y-2">
          <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold uppercase text-slate-200 text-xs">AI RECOMMENDATIONS</h3>
            </div>
            <span className="text-[10px] text-amber-400 font-bold">{recommendations.length} ACTIVE</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px]">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-2.5 rounded bg-[#080d16] border border-amber-500/30 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-[11px]">{rec.title}</span>
                  <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30">
                    {rec.category}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">{rec.description}</p>
                <div className="flex space-x-1 pt-1">
                  <button className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 py-1 rounded text-[9px] font-bold uppercase">
                    EXECUTE ADVICE
                  </button>
                  <button 
                    onClick={() => dismissRecommendation(rec.id)}
                    className="p-1 text-slate-500 hover:text-slate-300 text-[9px]"
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: NATURAL LANGUAGE MISSION ASSISTANT (4 COLS) */}
        <div className="col-span-4 bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1a2336] pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold uppercase text-slate-200 text-xs">NATURAL LANGUAGE MISSION ASSISTANT</h3>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          {/* CHAT MESSAGES LOG */}
          <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-[#060911] border border-[#1a2336] rounded max-h-[380px]">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`p-2 rounded max-w-[90%] space-y-1 ${
                  msg.sender === 'USER'
                    ? 'ml-auto bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                    : 'mr-auto bg-[#0d1424] border border-[#1a2336] text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-slate-400 border-b border-white/10 pb-0.5">
                  <span className="font-bold">{msg.sender === 'USER' ? 'COMMANDER VANCE' : 'SMART HORIZON AI'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="text-[11px] leading-relaxed">{msg.text}</p>

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {msg.suggestedActions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => sendNaturalLanguageQuery(act)}
                        className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] px-1.5 py-0.5 rounded flex items-center space-x-1"
                      >
                        <span>{act}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* INPUT FORM */}
          <form onSubmit={handleSendMessage} className="mt-2 flex space-x-1.5">
            <input
              type="text"
              placeholder="Ask AI Assistant (e.g. Search sector 4-B for vehicles)..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 bg-[#090d16] border border-[#1e293b] rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="submit"
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded font-bold flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
