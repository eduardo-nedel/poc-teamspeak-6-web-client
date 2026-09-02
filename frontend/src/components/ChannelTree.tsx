import React from 'react';
import { Hash, Volume2, Mic, MicOff, Headphones, Users } from 'lucide-react';
import { Channel, User } from '../types/ts6';

interface ChannelTreeProps {
  channels: Channel[];
  currentChannelId: number;
  currentUserId?: string | null;
  allChannelUsers?: Record<number, User[]>;
  onSelectChannel: (cid: number) => void;
}

export const ChannelTree: React.FC<ChannelTreeProps> = ({
  channels,
  currentChannelId,
  currentUserId,
  allChannelUsers = {},
  onSelectChannel,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
      <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        Canais de Voz ({channels.length})
      </div>

      {channels.map((channel) => {
        const isCurrent = channel.cid === currentChannelId;
        const usersInChannel = allChannelUsers[channel.cid] || [];
        const isCSpacer = channel.channel_name.startsWith('[cspacer');

        if (isCSpacer) {
          return (
            <div
              key={channel.cid}
              className="px-3 py-1.5 mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2"
            >
              <span className="truncate">
                {channel.channel_name.replace(/\[.*?\]/g, '').trim()}
              </span>
              {usersInChannel.length > 0 && (
                <span className="ml-auto bg-gray-800 text-gray-400 text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                  {usersInChannel.length}
                </span>
              )}
            </div>
          );
        }

        return (
          <div key={channel.cid} className="mb-0.5">
            <button
              onClick={() => onSelectChannel(channel.cid)}
              className={`w-full group text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all duration-150 border ${
                isCurrent
                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-gray-800/60 hover:border-gray-700/50 text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`p-1.5 rounded-lg ${
                    isCurrent
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-800/80 text-gray-400 group-hover:text-gray-200'
                  }`}
                >
                  {isCurrent ? (
                    <Volume2 className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Hash className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {channel.channel_name}
                  </div>
                  {channel.channel_topic && (
                    <div className="text-[10px] text-gray-500 truncate">
                      {channel.channel_topic}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                {usersInChannel.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isCurrent ? 'bg-blue-500/25 text-blue-300' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {usersInChannel.length}
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[9px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-md font-medium border border-blue-500/40">
                    Você está aqui
                  </span>
                )}
              </div>
            </button>

            {usersInChannel.length > 0 && (
              <div className="ml-8 mt-0.5 space-y-px">
                {usersInChannel.map((user) => {
                  const isYou = user.id === currentUserId;
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] transition-colors ${
                        user.isTalking
                          ? 'bg-green-500/10 text-green-400'
                          : isYou
                          ? 'text-blue-300'
                          : 'text-gray-500'
                      }`}
                    >
                      {user.isTalking && (
                        <span className="flex-shrink-0 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      )}
                      <span className="truncate">
                        {user.nickname}
                        {isYou && <span className="text-blue-400/60 ml-0.5">(você)</span>}
                      </span>
                      <span className="ml-auto flex-shrink-0 flex items-center gap-0.5">
                        {user.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                        {user.isDeafened && <Headphones className="w-3 h-3 text-red-400" />}
                        {!user.isMuted && !user.isDeafened && (
                          <Mic className="w-3 h-3 text-gray-600" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {channels.length === 0 && (
        <div className="text-center py-8 text-xs text-gray-500">
          Nenhum canal encontrado.
        </div>
      )}
    </div>
  );
};
