import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { CONFIG } from './config.js';
import { TS6WebQuery } from './ts6/webquery.js';
import { AudioBridge } from './ts6/audioBridge.js';

const app = express();
app.use(cors({ origin: CONFIG.CORS_ORIGIN }));
app.use(express.json());

const webQuery = new TS6WebQuery();
const audioBridge = new AudioBridge();

async function getFullChannelUsers(channelId: number) {
  const webUsers = audioBridge.getUsersByChannel(channelId);
  try {
    const ts6Clients = await webQuery.getClients();
    const nativeUsers = ts6Clients
      .filter((c) => c.cid === channelId && c.client_type === 0)
      .map((c) => ({
        id: `ts6_${c.clid}`,
        nickname: c.client_nickname,
        channelId: c.cid,
        isMuted: !!c.client_input_muted,
        isDeafened: !!c.client_output_muted,
        isTalking: !!c.client_is_talking,
        isNativeTS6: true,
      }));
    return [...nativeUsers, ...webUsers];
  } catch {
    return webUsers;
  }
}

async function getAllChannelUsers() {
  const result: Record<number, any[]> = {};
  const webUsers = audioBridge.getAllUsers();
  for (const u of webUsers) {
    if (!result[u.channelId]) result[u.channelId] = [];
    result[u.channelId].push(u);
  }
  try {
    const ts6Clients = await webQuery.getClients();
    for (const c of ts6Clients) {
      if (c.client_type === 0) {
        if (!result[c.cid]) result[c.cid] = [];
        result[c.cid].push({
          id: `ts6_${c.clid}`,
          nickname: c.client_nickname,
          channelId: c.cid,
          isMuted: !!c.client_input_muted,
          isDeafened: !!c.client_output_muted,
          isTalking: !!c.client_is_talking,
          isNativeTS6: true,
        });
      }
    }
  } catch { /* mantém webUsers */ }
  return result;
}

// Endpoints REST
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TS6 Web Gateway PoC',
    ts6Host: CONFIG.TS6_HOST,
    ts6Port: CONFIG.TS6_SERVER_ID,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/channels', async (req, res) => {
  try {
    const channels = await webQuery.getChannels();
    res.json({ success: true, channels });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await webQuery.getClients();
    res.json({ success: true, clients });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    users: audioBridge.getAllUsers(),
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const nickname = (url.searchParams.get('nickname') || 'WebGuest_' + Math.floor(Math.random() * 9000 + 1000)).slice(0, 30);
  const correlationId = url.searchParams.get('corr') || 'corr_' + crypto.randomBytes(4).toString('hex');
  const requestedChannel = parseInt(url.searchParams.get('channelId') || '1', 10);
  const initialChannelId = isNaN(requestedChannel) ? 1 : requestedChannel;
  const userId = 'usr_' + crypto.randomBytes(4).toString('hex');

  // Registra usuário IMEDIATAMENTE para processar áudio sem perda de pacotes
  const user = audioBridge.registerUser(userId, correlationId, nickname, initialChannelId, ws);
  console.log(`[${new Date().toISOString()}] [${correlationId}] [GATEWAY-WS] 🔌 Novo WebSocket aberto: ${nickname} (UID: ${userId}) no canal ${initialChannelId}`);

  // Registra handler de mensagens IMEDIATAMENTE (antes de qualquer await)
  ws.on('message', async (message: Buffer | string, isBinary: boolean) => {
    // 1. Se isBinary for false ou for string, ou começar com '{' -> trata como JSON
    let isJson = false;
    let data: any = null;

    if (!isBinary) {
      try {
        const text = typeof message === 'string' ? message : message.toString('utf-8');
        if (text.trim().startsWith('{')) {
          data = JSON.parse(text);
          isJson = true;
        }
      } catch {
        isJson = false;
      }
    }

    if (!isJson) {
      // Áudio PCM transmitido pelo microfone do usuário
      const audioBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
      audioBridge.broadcastAudio(userId, audioBuffer);
      return;
    }

    try {
      switch (data.type) {
        case 'switch_channel': {
          const targetCid = parseInt(data.channelId, 10);
          if (!isNaN(targetCid)) {
            audioBridge.moveUser(userId, targetCid);
            console.log(`[${new Date().toISOString()}] [${correlationId}] [GATEWAY-WS] 🔄 ${nickname} trocou para o canal ${targetCid}`);
            const updatedUsers = await getFullChannelUsers(targetCid);
            const allChannelUsers = await getAllChannelUsers();
            ws.send(JSON.stringify({
              type: 'channel_users_update',
              channelId: targetCid,
              users: updatedUsers,
              allChannelUsers,
            }));
          }
          break;
        }

        case 'set_mute': {
          audioBridge.setMuteState(userId, !!data.isMuted, !!data.isDeafened);
          break;
        }

        case 'set_talking': {
          audioBridge.setTalkingState(userId, !!data.isTalking);
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          console.warn(`[${new Date().toISOString()}] [${correlationId}] [GATEWAY-WS] ⚠️ Mensagem JSON não reconhecida:`, data);
      }
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] [${correlationId}] [GATEWAY-WS] ❌ Erro ao processar mensagem JSON:`, err.message);
    }
  });

  // Carrega canais (torna a conexão oficial após init)
  try {
    const channels = await webQuery.getChannels();
    const initialUsers = await getFullChannelUsers(initialChannelId);
    const allChannelUsers = await getAllChannelUsers();

    // Envia payload de inicialização
    ws.send(JSON.stringify({
      type: 'init',
      userId,
      correlationId,
      nickname,
      channelId: initialChannelId,
      channels,
      channelUsers: initialUsers,
      allChannelUsers,
    }));
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [${correlationId}] [GATEWAY-WS] ❌ Erro ao carregar canais:`, err.message);
    ws.send(JSON.stringify({
      type: 'init',
      userId,
      correlationId,
      nickname,
      channelId: initialChannelId,
      channels: [],
      channelUsers: [],
    }));
  }

  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] [${correlationId}] [GATEWAY-WS] 🔌 WebSocket fechado: ${nickname} (UID: ${userId})`);
    audioBridge.removeUser(userId);
  });

  ws.on('error', (err: any) => {
    console.error(`[${new Date().toISOString()}] [${correlationId}] [GATEWAY-WS] ❌ Erro no socket (${nickname}):`, err.message || err);
  });
});

server.listen(CONFIG.PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 TS6 Web Gateway rodando na porta ${CONFIG.PORT}`);
  console.log(`📡 TS6 Host Alvo: ${CONFIG.TS6_HOST}:${CONFIG.TS6_WEBQUERY_PORT}`);
  console.log(`🌐 WebSocket: ws://localhost:${CONFIG.PORT}/ws`);
  console.log(`=========================================`);
});
