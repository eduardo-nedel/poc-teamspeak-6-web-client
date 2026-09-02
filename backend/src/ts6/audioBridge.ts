import { WebSocket } from 'ws';
import OpusScript from 'opusscript';
import { Ts3Client } from '../tslib/client.js';
import { generateIdentity } from '../tslib/identity.js';
import { buildCommand } from '../tslib/commands.js';
import { CONFIG } from '../config.js';

export interface WebUser {
  id: string;
  correlationId: string;
  nickname: string;
  channelId: number;
  isMuted: boolean;
  isDeafened: boolean;
  isTalking: boolean;
  ws: WebSocket;
  connectedAt: Date;
  tsClient?: Ts3Client;
  tsClientId?: number;
  opusDecoder: any;
  opusEncoder: any;
  pcmAccumulator: Buffer;
  stats: {
    micPacketsReceived: number;
    micBytesReceived: number;
    opusFramesSent: number;
    opusBytesSent: number;
    ts6VoicePacketsReceived: number;
    lastMicLogAt: number;
    lastTs6VoiceLogAt: number;
  };
}

export class AudioBridge {
  private users: Map<string, WebUser> = new Map();

  /**
   * Registra um novo usuário web conectado e instancia o cliente virtual TS6 com codec Opus e rastreamento de Correlation ID
   */
  public registerUser(id: string, correlationId: string, nickname: string, channelId: number, ws: WebSocket): WebUser {
    const opusDecoder = new OpusScript(48000, 2, OpusScript.Application.AUDIO);
    const opusEncoder = new OpusScript(48000, 2, OpusScript.Application.AUDIO);

    const user: WebUser = {
      id,
      correlationId,
      nickname,
      channelId,
      isMuted: false,
      isDeafened: false,
      isTalking: false,
      ws,
      connectedAt: new Date(),
      opusDecoder,
      opusEncoder,
      pcmAccumulator: Buffer.alloc(0),
      stats: {
        micPacketsReceived: 0,
        micBytesReceived: 0,
        opusFramesSent: 0,
        opusBytesSent: 0,
        ts6VoicePacketsReceived: 0,
        lastMicLogAt: 0,
        lastTs6VoiceLogAt: 0,
      },
    };

    console.log(`[${new Date().toISOString()}] [${correlationId}] [AUDIO-BRIDGE] 🚀 Registrando usuário: ${nickname} (UID: ${id}) no canal ${channelId}`);

    try {
      const tsClient = new Ts3Client();
      user.tsClient = tsClient;
      const identity = generateIdentity(8);

      tsClient.on('connected', () => {
        user.tsClientId = tsClient.getClientId();
        console.log(`[${new Date().toISOString()}] [${correlationId}] [TS6-NATIVE] ✅ Ts3Client conectado no TS6! Nick: ${nickname}, Clid: ${user.tsClientId}, Canal: ${channelId}`);
      });

      // Escuta voz vinda do servidor TeamSpeak 6
      tsClient.on('voice', (voiceData: Buffer) => {
        user.stats.ts6VoicePacketsReceived++;
        const now = Date.now();
        if (now - user.stats.lastTs6VoiceLogAt > 2000) {
          user.stats.lastTs6VoiceLogAt = now;
          console.log(`[${new Date().toISOString()}] [${correlationId}] [TS6->WEB] 🔊 Recebendo voz do TS6! Total pacotes: ${user.stats.ts6VoicePacketsReceived}, tamanho frame atual: ${voiceData.length}B`);
        }

        if (voiceData.length <= 5) return;
        try {
          const fromClid = voiceData.readUInt16BE(2);
          const opusPayload = voiceData.subarray(5);
          if (opusPayload.length === 0) return;

          // Decodifica Opus para PCM estéreo 48kHz
          let pcm: Buffer;
          try {
            pcm = user.opusDecoder.decode(opusPayload);
          } catch (e: any) {
            console.warn(`[${new Date().toISOString()}] [${correlationId}] [OPUS-DEC] ⚠️ Erro ao decodificar Opus: ${e.message}`);
            return;
          }

          if (pcm && pcm.length > 0) {
            const senderId = `ts6_${fromClid}`;
            const senderIdBuf = Buffer.from(senderId, 'utf-8');
            const header = Buffer.alloc(4);
            header.writeUInt32BE(senderIdBuf.length, 0);
            const packet = Buffer.concat([header, senderIdBuf, pcm]);

            if (user.ws.readyState === WebSocket.OPEN && !user.isDeafened) {
              user.ws.send(packet);
            }
          }
        } catch (err: any) {
          console.error(`[${new Date().toISOString()}] [${correlationId}] [AUDIO-BRIDGE] ❌ Erro ao processar áudio recebido do TS6:`, err.message);
        }
      });

      tsClient.on('error', (err: any) => {
        console.error(`[${new Date().toISOString()}] [${correlationId}] [TS6-NATIVE] ⚠️ Erro no Ts3Client (${nickname}):`, err.message || err);
      });

      tsClient.on('disconnected', (reason: any) => {
        console.log(`[${new Date().toISOString()}] [${correlationId}] [TS6-NATIVE] 🔌 Ts3Client desconectado (${nickname}):`, reason);
      });

      tsClient.connect({
        host: CONFIG.TS6_VOICE_HOST,
        port: CONFIG.TS6_VOICE_PORT,
        serverPassword: CONFIG.TS6_SERVER_PASSWORD,
        nickname,
        identity,
        defaultChannel: String(channelId),
      }).catch((err) => {
        console.error(`[${new Date().toISOString()}] [${correlationId}] [TS6-NATIVE] ❌ Falha ao conectar Ts3Client (${nickname}):`, err.message);
      });
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] [${correlationId}] [AUDIO-BRIDGE] ❌ Falha ao instanciar Ts3Client:`, e.message);
    }

    this.users.set(id, user);
    this.broadcastChannelUsers(channelId);
    return user;
  }

  /**
   * Remove usuário ao desconectar e encerra o cliente virtual TS6
   */
  public removeUser(id: string): void {
    const user = this.users.get(id);
    if (user) {
      const cid = user.channelId;
      console.log(`[${new Date().toISOString()}] [${user.correlationId}] [AUDIO-BRIDGE] 🚪 Desconectando usuário ${user.nickname}. Total áudio enviado: ${user.stats.opusBytesSent}B (${user.stats.opusFramesSent} frames), total áudio recebido: ${user.stats.ts6VoicePacketsReceived} pacotes`);
      if (user.tsClient) {
        try {
          user.tsClient.disconnect();
        } catch { }
      }
      this.users.delete(id);
      this.broadcastToChannel(cid, {
        type: 'user_left',
        userId: id,
        nickname: user.nickname,
      });
      this.broadcastChannelUsers(cid);
    }
  }

  /**
   * Altera a sala/canal do usuário e move o cliente virtual no TeamSpeak 6
   */
  public moveUser(id: string, newChannelId: number): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    const oldChannelId = user.channelId;
    user.channelId = newChannelId;
    user.isTalking = false;

    console.log(`[${new Date().toISOString()}] [${user.correlationId}] [AUDIO-BRIDGE] 🔄 Movendo ${user.nickname}: canal ${oldChannelId} -> ${newChannelId}`);

    if (user.tsClient && user.tsClientId) {
      try {
        user.tsClient.sendCommand(buildCommand('clientmove', {
          cid: String(newChannelId),
          clid: String(user.tsClientId),
        }));
      } catch (err: any) {
        console.error(`[${new Date().toISOString()}] [${user.correlationId}] [TS6-NATIVE] ❌ Falha no clientmove:`, err.message);
      }
    }

    this.broadcastToChannel(oldChannelId, {
      type: 'user_left',
      userId: id,
      nickname: user.nickname,
    });
    this.broadcastChannelUsers(oldChannelId);

    this.broadcastToChannel(newChannelId, {
      type: 'user_joined',
      user: this.sanitizeUser(user),
    });
    this.broadcastChannelUsers(newChannelId);

    this.send(user.ws, {
      type: 'channel_switched',
      channelId: newChannelId,
    });

    return true;
  }

  /**
   * Atualiza status de mudo / surdo
   */
  public setMuteState(id: string, isMuted: boolean, isDeafened: boolean): void {
    const user = this.users.get(id);
    if (user) {
      user.isMuted = isMuted;
      user.isDeafened = isDeafened;
      if (isMuted) {
        user.isTalking = false;
        if (user.tsClient) user.tsClient.sendVoiceStop();
      }

      console.log(`[${new Date().toISOString()}] [${user.correlationId}] [STATE] 🔇 Mute: ${isMuted}, Deafen: ${isDeafened}`);

      this.broadcastToChannel(user.channelId, {
        type: 'user_state_changed',
        userId: id,
        isMuted,
        isDeafened,
        isTalking: user.isTalking,
      });
    }
  }

  /**
   * Atualiza e propaga estado de fala (talking indicator)
   */
  public setTalkingState(id: string, isTalking: boolean): void {
    const user = this.users.get(id);
    if (user && !user.isMuted) {
      user.isTalking = isTalking;
      if (!isTalking && user.tsClient) {
        user.tsClient.sendVoiceStop();
      }
      this.broadcastToChannel(user.channelId, {
        type: 'user_talking',
        userId: id,
        isTalking,
      });
    }
  }

  private lastSentAt: number = 0;

  /**
   * Transmite áudio do microfone do usuário para o TS6 (Opus) e para outros clientes web
   */
  public broadcastAudio(senderId: string, audioChunk: Buffer): void {
    const sender = this.users.get(senderId);
    if (!sender || sender.isMuted) return;

    // Tracker de tempo para diagnóstico de Jitter
    const now = Date.now();
    const delta = this.lastSentAt > 0 ? now - this.lastSentAt : 0;
    this.lastSentAt = now;

    sender.stats.micPacketsReceived++;
    sender.stats.micBytesReceived += audioChunk.length;

    // 1. Envia voz para o TeamSpeak 6 (codificado em Opus Stereo 48kHz)
    if (sender.tsClient && sender.opusEncoder) {
      try {
        sender.pcmAccumulator = Buffer.concat([sender.pcmAccumulator, audioChunk]);

        // Processa blocos de 960 amostras (1920 bytes mono -> 3840 bytes estéreo)
        while (sender.pcmAccumulator.length >= 1920) {
          const monoFrame = sender.pcmAccumulator.subarray(0, 1920);
          sender.pcmAccumulator = sender.pcmAccumulator.subarray(1920);

          const stereoPcm = Buffer.alloc(3840);
          for (let i = 0; i < 960; i++) {
            const sample = monoFrame.readInt16LE(i * 2);
            stereoPcm.writeInt16LE(sample, i * 4);     // Left
            stereoPcm.writeInt16LE(sample, i * 4 + 2); // Right
          }

          try {
            const encoded = sender.opusEncoder.encode(stereoPcm, 960);
            if (encoded && encoded.length > 0) {
              sender.tsClient.sendVoice(Buffer.from(encoded));
              sender.stats.opusFramesSent++;
              sender.stats.opusBytesSent += encoded.length;
            }
          } catch (encErr: any) {
            sender.opusEncoder = new OpusScript(48000, 2, OpusScript.Application.AUDIO);
          }
        }

        if (now - sender.stats.lastMicLogAt > 2000) {
          sender.stats.lastMicLogAt = now;
          console.log(`[${new Date().toISOString()}] [${sender.correlationId}] [WEB->TS6] 🎙️ Delta tempo envio: ${delta}ms. Frames enviados: ${sender.stats.opusFramesSent}`);
        }
      } catch (err: any) {
        console.error(`[${new Date().toISOString()}] [${sender.correlationId}] [OPUS-ENC] ❌ Erro ao codificar voz:`, err.message);
      }
    }

    // 2. Distribui para outros clientes web conectados no mesmo canal
    const senderIdBuf = Buffer.from(senderId, 'utf-8');
    const header = Buffer.alloc(4);
    header.writeUInt32BE(senderIdBuf.length, 0);
    const packet = Buffer.concat([header, senderIdBuf, audioChunk]);

    for (const user of this.users.values()) {
      if (user.id !== senderId && user.channelId === sender.channelId && !user.isDeafened) {
        if (user.ws.readyState === WebSocket.OPEN) {
          user.ws.send(packet);
        }
      }
    }
  }

  /**
   * Retorna lista de usuários em uma sala
   */
  public getUsersByChannel(channelId: number) {
    return Array.from(this.users.values())
      .filter((u) => u.channelId === channelId)
      .map(this.sanitizeUser);
  }

  /**
   * Retorna todos os usuários conectados agrupados por canal
   */
  public getAllUsers() {
    return Array.from(this.users.values()).map(this.sanitizeUser);
  }

  private sanitizeUser(u: WebUser) {
    return {
      id: u.id,
      nickname: u.nickname,
      channelId: u.channelId,
      isMuted: u.isMuted,
      isDeafened: u.isDeafened,
      isTalking: u.isTalking,
      connectedAt: u.connectedAt,
    };
  }

  private broadcastToChannel(channelId: number, data: object): void {
    for (const user of this.users.values()) {
      if (user.channelId === channelId && user.ws.readyState === WebSocket.OPEN) {
        this.send(user.ws, data);
      }
    }
  }

  public broadcastChannelUsers(channelId: number): void {
    const users = this.getUsersByChannel(channelId);
    this.broadcastToChannel(channelId, {
      type: 'channel_users_update',
      channelId,
      users,
    });
  }

  private send(ws: WebSocket, data: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}
