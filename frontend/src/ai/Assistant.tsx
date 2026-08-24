import React, { useState } from 'react';
import { useAIStore } from '../stores/aiStore';
import { wsClient } from '../communication/WebSocketClient';
import { Bot, Send, User } from 'lucide-react';

export const Assistant: React.FC = () => {
  const { assistant_messages, addAssistantMessage } = useAIStore();
  const [query, setQuery] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    addAssistantMessage({
      msg_id: `msg-${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: Date.now(),
    });

    wsClient.sendCommand('AI_ASK', { query });
    setQuery('');
  };

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs flex flex-col h-72 select-none">
      <div className="flex items-center space-x-1.5 font-bold text-slate-200 border-b border-slate-800 pb-2 mb-2">
        <Bot className="w-3.5 h-3.5 text-purple-400" />
        <span>TACTICAL MISSION NLP ASSISTANT</span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {assistant_messages.map((m) => (
          <div
            key={m.msg_id}
            className={`flex items-start space-x-2 text-[11px] ${
              m.sender === 'USER' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.sender !== 'USER' && (
              <div className="w-5 h-5 rounded bg-purple-950 border border-purple-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-purple-300" />
              </div>
            )}
            <div
              className={`p-2 rounded max-w-[85%] ${
                m.sender === 'USER'
                  ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-200'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              {m.text}
            </div>
            {m.sender === 'USER' && (
              <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3 h-3 text-cyan-300" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="mt-2 flex space-x-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI advisor..."
          className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-purple-400"
        />
        <button
          type="submit"
          className="px-3 py-1 rounded bg-purple-900/70 border border-purple-500/50 hover:bg-purple-800 text-purple-200 transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
