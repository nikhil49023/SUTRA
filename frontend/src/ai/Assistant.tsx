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
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs flex flex-col h-80 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2 mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">TACTICAL NLP COMMANDER</span>
            <span className="text-[10px] text-[#707C88] ml-2">// NATURAL LANGUAGE INTEL</span>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {assistant_messages.length === 0 ? (
          <div className="text-center py-8 text-[#707C88] text-[11px]">
            Ready for tactical natural language queries. Type a command or question below (e.g. <em>"takeoff 20m"</em>, <em>"assess threat index"</em>).
          </div>
        ) : (
          assistant_messages.map((m) => (
            <div
              key={m.msg_id}
              className={`flex items-start space-x-2 text-[11px] ${
                m.sender === 'USER' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.sender !== 'USER' && (
                <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#5B8FB9]" />
                </div>
              )}
              <div
                className={`p-2.5 rounded-lg max-w-[85%] ${
                  m.sender === 'USER'
                    ? 'bg-[#1B2530] border border-[#5B8FB9]/50 text-[#E7EBEF]'
                    : 'bg-[#151D26] border border-[#2B3743] text-[#A9B3BD]'
                }`}
              >
                {m.text}
              </div>
              {m.sender === 'USER' && (
                <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-[#5B8FB9]" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="mt-2.5 flex space-x-1.5 pt-2 border-t border-[#2B3743]">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI advisor or type flight command..."
          className="flex-1 bg-[#0B0F14] border border-[#2B3743] rounded px-3 py-1.5 text-[#E7EBEF] text-xs font-mono focus:border-[#5B8FB9] focus:outline-none placeholder-[#707C88]"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] transition flex items-center justify-center flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
