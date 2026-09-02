import React, { useState, useEffect } from 'react';
import { useTS6Client } from './hooks/useTS6Client';
import { useVoiceAudio } from './hooks/useVoiceAudio';
import { Header } from './components/Header';
import { ConnectModal } from './components/ConnectModal';
import { ChannelTree } from './components/ChannelTree';
import { UserList } from './components/UserList';
import { VoiceControls } from './components/VoiceControls';

export const App: React.FC = () => {
  const [gatewayHost, setGatewayHost] = useState<string>(
    window.location.hostname === 'localhost' ? 'localhost:4000' : `${window.location.hostname}:4000`
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isPTT, setIsPTT] = useState<boolean>(false);
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);

  const {
    isConnected,
    isConnecting,
    error: clientError,
    currentUserId,
    nickname,
    currentChannelId,
    channels,
    channelUsers,
    allChannelUsers,
    connect,
    disconnect,
    switchChannel,
    setMuteState,
    setTalkingState,
    sendAudio,
  } = useTS6Client({
    onAudioReceived: (audioData) => {
      playIncomingAudio(audioData);
    },
  });

  const {
    audioLevel,
    hasMicPermission,
    micError,
    startAudio,
    stopAudio,
    playIncomingAudio,
  } = useVoiceAudio({
    isMuted,
    isDeafened,
    isPTT,
    isPTTActive,
    onTalkingChange: (isTalking) => {
      setTalkingState(isTalking);
    },
    onSendAudio: (chunk) => {
      sendAudio(chunk);
    },
  });

  const handleConnect = async (host: string, nick: string) => {
    setGatewayHost(host);
    connect(host, nick);
    // Inicia áudio automaticamente se permitido
    startAudio();
  };

  const handleDisconnect = () => {
    stopAudio();
    disconnect();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setMuteState(nextMuted, isDeafened);
  };

  const handleToggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    // Se surdo, também muta
    if (nextDeafened) {
      setIsMuted(true);
      setMuteState(true, true);
    } else {
      setMuteState(isMuted, false);
    }
  };

  const currentChannel = channels.find((c) => c.cid === currentChannelId);
  const channelName = currentChannel ? currentChannel.channel_name : 'Canal Atual';

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0E14] text-gray-200 select-none overflow-hidden">
      {!isConnected && (
        <ConnectModal
          defaultHost={gatewayHost}
          onConnect={handleConnect}
          isConnecting={isConnecting}
          error={clientError}
        />
      )}

      {/* Cabeçalho */}
      <Header
        serverName="TeamSpeak 6 Web Client"
        gatewayHost={gatewayHost}
        isConnected={isConnected}
        nickname={nickname}
        onDisconnect={handleDisconnect}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Barra Lateral: Canais */}
        <aside className="w-72 bg-[#12161F] border-r border-gray-800 flex flex-col">
          <ChannelTree
            channels={channels}
            currentChannelId={currentChannelId}
            currentUserId={currentUserId}
            allChannelUsers={allChannelUsers}
            onSelectChannel={(cid) => switchChannel(cid)}
          />
        </aside>

        {/* Painel Central: Usuários do Canal e Status de Fala */}
        <main className="flex-1 flex flex-col bg-[#0F1318]">
          <UserList
            users={channelUsers}
            currentUserId={currentUserId}
            channelName={channelName}
          />
        </main>
      </div>

      {/* Controles de Voz & Microfone */}
      <VoiceControls
        isMuted={isMuted}
        isDeafened={isDeafened}
        isPTT={isPTT}
        isPTTActive={isPTTActive}
        audioLevel={audioLevel}
        hasMicPermission={hasMicPermission}
        micError={micError}
        onToggleMute={handleToggleMute}
        onToggleDeafen={handleToggleDeafen}
        onTogglePTT={() => setIsPTT(!isPTT)}
        onPTTStateChange={(active) => setIsPTTActive(active)}
        onStartAudio={startAudio}
      />
    </div>
  );
};
