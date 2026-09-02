import React from 'react';
import { Radio, LogOut, ShieldCheck, Wifi } from 'lucide-react';

interface HeaderProps {
  serverName?: string;
  gatewayHost: string;
  isConnected: boolean;
  nickname: string;
  onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverName = 'TeamSpeak 6 Server',
  gatewayHost,
  isConnected,
  nickname,
  onDisconnect,
}) => {
  return (
    <header className="h-14 bg-[#12161F] border-b border-gray-800 px-5 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600/20 text-blue-400 p-2 rounded-lg border border-blue-500/30">
          <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold text-white tracking-wide">{serverName}</h1>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> TS6 WebRTC
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono">{gatewayHost}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {isConnected ? (
          <>
            <div className="flex items-center space-x-2 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-gray-200">{nickname}</span>
            </div>

            <button
              onClick={onDisconnect}
              className="flex items-center space-x-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 transition duration-150 active:scale-95"
              title="Desconectar do servidor"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Desconectado</span>
          </div>
        )}
      </div>
    </header>
  );
};
