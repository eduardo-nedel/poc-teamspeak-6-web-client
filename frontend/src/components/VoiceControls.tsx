import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Headphones, VolumeX, Radio, Keyboard, Volume2 } from 'lucide-react';

interface VoiceControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  isPTT: boolean;
  isPTTActive: boolean;
  audioLevel: number;
  hasMicPermission: boolean;
  micError: string | null;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onTogglePTT: () => void;
  onPTTStateChange: (active: boolean) => void;
  onStartAudio: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isMuted,
  isDeafened,
  isPTT,
  isPTTActive,
  audioLevel,
  hasMicPermission,
  micError,
  onToggleMute,
  onToggleDeafen,
  onTogglePTT,
  onPTTStateChange,
  onStartAudio,
}) => {
  // Push to talk via barra de espaço quando ativado
  useEffect(() => {
    if (!isPTT) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        onPTTStateChange(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onPTTStateChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPTT, onPTTStateChange]);

  return (
    <div className="bg-[#12161F] border-t border-gray-800 px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
      {/* Botões Mute / Deafen / Modo */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleMute}
          className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold transition ${
            isMuted
              ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-gray-800/80 border-gray-700 hover:bg-gray-700/80 text-gray-200'
          }`}
          title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'Mutado' : 'Microfone'}</span>
        </button>

        <button
          onClick={onToggleDeafen}
          className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold transition ${
            isDeafened
              ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-gray-800/80 border-gray-700 hover:bg-gray-700/80 text-gray-200'
          }`}
          title={isDeafened ? 'Ativar Áudio' : 'Desativar Áudio'}
        >
          {isDeafened ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4 text-blue-400" />}
          <span>{isDeafened ? 'Surdo' : 'Áudio'}</span>
        </button>

        <button
          onClick={onTogglePTT}
          className={`p-2.5 rounded-xl border flex items-center space-x-1.5 text-xs font-semibold transition ${
            isPTT
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
              : 'bg-gray-800/80 border-gray-700 hover:bg-gray-700/80 text-gray-400'
          }`}
          title="Alternar entre Ativação por Voz e Push-to-Talk"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>{isPTT ? 'Push-To-Talk [Espaço]' : 'Voz Contínua (VAD)'}</span>
        </button>
      </div>

      {/* Botão de Segurar para Falar (Mobile ou PTT) ou VU Meter */}
      <div className="flex items-center space-x-4 w-full md:w-auto">
        {!hasMicPermission ? (
          <button
            onClick={onStartAudio}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition"
          >
            <Mic className="w-4 h-4" />
            <span>Ativar Microfone no Navegador</span>
          </button>
        ) : isPTT ? (
          <button
            onMouseDown={() => onPTTStateChange(true)}
            onMouseUp={() => onPTTStateChange(false)}
            onTouchStart={() => onPTTStateChange(true)}
            onTouchEnd={() => onPTTStateChange(false)}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider select-none border transition-all ${
              isPTTActive
                ? 'bg-emerald-500 text-black border-emerald-400 scale-95 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {isPTTActive ? 'Transmitindo Áudio...' : 'Segure para Falar'}
          </button>
        ) : (
          <div className="flex items-center space-x-2 w-full md:w-48">
            <Volume2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden p-0.5 border border-gray-700">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 15 ? 'bg-emerald-400' : 'bg-gray-600'
                }`}
                style={{ width: `${Math.min(100, audioLevel)}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-mono text-gray-400 w-6 text-right">
              {audioLevel}%
            </span>
          </div>
        )}

        {micError && (
          <span className="text-[11px] text-red-400 truncate max-w-xs" title={micError}>
            {micError}
          </span>
        )}
      </div>
    </div>
  );
};
