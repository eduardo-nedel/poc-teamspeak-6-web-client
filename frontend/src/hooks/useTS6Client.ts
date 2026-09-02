import { useState, useRef, useCallback, useEffect } from 'react';
import { Channel, User } from '../types/ts6';

interface UseTS6ClientProps {
  onAudioReceived?: (audioData: ArrayBuffer, senderId: string) => void;
}

export function useTS6Client({ onAudioReceived }: UseTS6ClientProps = {}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [currentChannelId, setCurrentChannelId] = useState<number>(1);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelUsers, setChannelUsers] = useState<User[]>([]);
  const [allChannelUsers, setAllChannelUsers] = useState<Record<number, User[]>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const onAudioReceivedRef = useRef(onAudioReceived);
  const currentChannelIdRef = useRef<number>(currentChannelId);

  useEffect(() => {
    onAudioReceivedRef.current = onAudioReceived;
  }, [onAudioReceived]);

  useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
  }, [currentChannelId]);

  const connect = useCallback((wsHost: string, userNick: string, initialCid: number = 1) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsConnecting(true);
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const finalHost = wsHost || window.location.hostname + ':4000';
    const wsUrl = `${protocol}//${finalHost}/ws?nickname=${encodeURIComponent(userNick)}&channelId=${initialCid}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[TS6Client] WebSocket conectado');
      setIsConnecting(false);
      setIsConnected(true);
      setNickname(userNick);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'init':
              setCurrentUserId(msg.userId);
              setCurrentChannelId(msg.channelId);
              if (msg.channels) setChannels(msg.channels);
              if (msg.channelUsers) setChannelUsers(msg.channelUsers);
              if (msg.allChannelUsers) setAllChannelUsers(msg.allChannelUsers);
              break;

            case 'channel_users_update': {
              const activeCid = currentChannelIdRef.current;
              if (msg.channelId === activeCid) {
                setChannelUsers(msg.users || []);
              }
              if (msg.allChannelUsers) {
                setAllChannelUsers(msg.allChannelUsers);
              }
              break;
            }

            case 'user_talking':
              setChannelUsers((prev) =>
                prev.map((u) => (u.id === msg.userId ? { ...u, isTalking: msg.isTalking } : u))
              );
              break;

            case 'user_state_changed':
              setChannelUsers((prev) =>
                prev.map((u) =>
                  u.id === msg.userId
                    ? { ...u, isMuted: msg.isMuted, isDeafened: msg.isDeafened, isTalking: msg.isTalking }
                    : u
                )
              );
              break;

            case 'channel_switched':
              setCurrentChannelId(msg.channelId);
              break;

            default:
              break;
          }
        } catch (e) {
          console.error('[TS6Client] Erro ao analisar JSON recebido:', e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Formato binário: 4 bytes length + senderId string + áudio PCM
        const buf = event.data;
        const view = new DataView(buf);
        if (buf.byteLength > 4) {
          const idLen = view.getUint32(0, false);
          if (buf.byteLength >= 4 + idLen) {
            const senderIdBuf = new Uint8Array(buf, 4, idLen);
            const senderId = new TextDecoder().decode(senderIdBuf);
            const audioData = buf.slice(4 + idLen);
            if (onAudioReceivedRef.current) {
              onAudioReceivedRef.current(audioData, senderId);
            }
          }
        }
      }
    };

    ws.onerror = (e) => {
      console.error('[TS6Client] Erro no WebSocket:', e);
      setError('Falha de conexão com o Gateway do TeamSpeak 6.');
      setIsConnecting(false);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[TS6Client] Conexão encerrada');
      setIsConnected(false);
      setIsConnecting(false);
      setChannelUsers([]);
      setCurrentUserId(null);
    };
  }, [currentChannelId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setChannelUsers([]);
    setCurrentUserId(null);
  }, []);

  const switchChannel = useCallback((targetChannelId: number) => {
    console.log('[TS6Client] 🔄 switchChannel solicitado para cid:', targetChannelId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({
        type: 'switch_channel',
        channelId: targetChannelId,
      });
      console.log('[TS6Client] 📤 Enviando switch_channel via WS:', msg);
      wsRef.current.send(msg);
    } else {
      console.warn('[TS6Client] ⚠️ Não foi possível enviar switch_channel, WS readyState:', wsRef.current?.readyState);
    }
  }, []);

  const setMuteState = useCallback((isMuted: boolean, isDeafened: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'set_mute',
          isMuted,
          isDeafened,
        })
      );
    }
  }, []);

  const setTalkingState = useCallback((isTalking: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'set_talking',
          isTalking,
        })
      );
    }
  }, []);

  const sendAudio = useCallback((audioBuffer: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioBuffer);
    }
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
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
  };
}
