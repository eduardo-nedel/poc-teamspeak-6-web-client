import React from 'react';
import { Mic, MicOff, VolumeX, Radio, Sparkles } from 'lucide-react';
import { User } from '../types/ts6';

interface UserListProps {
  users: User[];
  currentUserId: string | null;
  channelName: string;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  currentUserId,
  channelName,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#10141B] p-4">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{channelName}</span>
          </h2>
          <p className="text-[11px] text-gray-400">
            {users.length} {users.length === 1 ? 'usuário na sala' : 'usuários na sala'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {users.map((user) => {
          const isMe = user.id === currentUserId;
          return (
            <div
              key={user.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                user.isTalking
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10 scale-[1.01]'
                  : 'bg-[#161B24] border-gray-800/80 hover:border-gray-700/60'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                {/* Avatar com status de fala */}
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase transition-all duration-150 ${
                      user.isTalking
                        ? 'bg-emerald-500 text-black ring-4 ring-emerald-500/30'
                        : isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {user.nickname.slice(0, 2)}
                  </div>
                  {user.isTalking && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#10141B] animate-pulse"></span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-gray-100 truncate">
                      {user.nickname}
                    </span>
                    {isMe && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-medium">
                        você
                      </span>
                    )}
                    {user.isNativeTS6 && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-medium border border-purple-500/30">
                        TS6 Client
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {user.isTalking ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Falando...
                      </span>
                    ) : (
                      <span>Ouvindo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ícones de Estado (Mute / Deafen) */}
              <div className="flex items-center space-x-1.5 text-gray-400">
                {user.isMuted && (
                  <span title="Microfone Mutado" className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
                    <MicOff className="w-3.5 h-3.5" />
                  </span>
                )}
                {user.isDeafened && (
                  <span title="Áudio Desativado" className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
                    <VolumeX className="w-3.5 h-3.5" />
                  </span>
                )}
                {!user.isMuted && !user.isDeafened && (
                  <span className="p-1.5 text-gray-500">
                    <Mic className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {users.length === 0 && (
          <div className="text-center py-16 text-xs text-gray-500">
            Esta sala está vazia.
          </div>
        )}
      </div>
    </div>
  );
};
