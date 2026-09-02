import React, { useState } from 'react';
import { Radio, User, Server, Play } from 'lucide-react';

interface ConnectModalProps {
  defaultHost: string;
  onConnect: (host: string, nickname: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  defaultHost,
  onConnect,
  isConnecting,
  error,
}) => {
  const [host, setHost] = useState(defaultHost);
  const [nickname, setNickname] = useState('WebUser_' + Math.floor(Math.random() * 899 + 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    onConnect(host.trim(), nickname.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#161B24] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-600/20 text-blue-400 p-3 rounded-xl border border-blue-500/30">
            <Radio className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">TeamSpeak 6 WebClient</h2>
            <p className="text-xs text-gray-400">Proof of Concept — Voz & WebRTC</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" /> Gateway TS6 (Host:Porta)
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="localhost:4000 ou 168.138.127.76:4000"
              className="w-full bg-[#0F1318] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" /> Seu Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={25}
              placeholder="Ex: Pedro, nedflanders..."
              className="w-full bg-[#0F1318] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition duration-150 shadow-lg shadow-blue-600/20"
          >
            {isConnecting ? (
              <span className="flex items-center space-x-2 text-sm">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Conectando ao TS6...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2 text-sm font-semibold">
                <Play className="w-4 h-4 fill-current" />
                <span>Entrar no Servidor</span>
              </span>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-800/80 text-[11px] text-gray-500 text-center">
          Conexão de voz via WebRTC / WebSockets em tempo real.
        </div>
      </div>
    </div>
  );
};
