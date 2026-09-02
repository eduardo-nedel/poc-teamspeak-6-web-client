import http from 'http';
import { CONFIG } from '../config.js';

export interface TS6Channel {
  cid: number;
  pid: number;
  channel_name: string;
  channel_topic?: string;
  channel_codec?: number;
  total_clients?: number;
  channel_order?: number;
}

export interface TS6Client {
  clid: number;
  cid: number;
  client_nickname: string;
  client_type: number; // 0 = regular, 1 = ServerQuery
  client_is_talking?: boolean;
  client_input_muted?: boolean;
  client_output_muted?: boolean;
}

export class TS6WebQuery {
  private host: string;
  private port: number;
  private apiKey: string;
  private serverId: number;

  constructor() {
    this.host = CONFIG.TS6_HOST;
    this.port = CONFIG.TS6_WEBQUERY_PORT;
    this.apiKey = CONFIG.TS6_API_KEY;
    this.serverId = CONFIG.TS6_SERVER_ID;
  }

  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queryParts = Object.entries(params).map(([k, v]) => {
        if (v === '' || v === undefined) return encodeURIComponent(k);
        return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
      });
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const path = `/${this.serverId}/${endpoint}${queryString}`;

      const req = http.request(
        {
          host: this.host,
          port: this.port,
          path,
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'Accept': 'application/json',
          },
          timeout: 4000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                return reject(new Error(`TS6 WebQuery error (${res.statusCode}): ${data}`));
              }
              const parsed = JSON.parse(data);
              resolve((parsed.body || parsed.response || parsed) as T);
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TS6 WebQuery timeout'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  /**
   * Obtém lista de canais do TeamSpeak 6
   */
  public async getChannels(): Promise<TS6Channel[]> {
    try {
      const result = await this.request<any>('channellist', { '-topic': '', '-flags': '' });
      let list: any[] = [];
      if (Array.isArray(result)) list = result;
      else if (result && Array.isArray(result.data)) list = result.data;
      else if (result && Array.isArray(result.body)) list = result.body;

      if (list.length > 0) {
        return list.map((c: any) => ({
          cid: parseInt(c.cid, 10),
          pid: parseInt(c.pid, 10),
          channel_name: c.channel_name,
          channel_topic: c.channel_topic || '',
          total_clients: parseInt(c.total_clients || '0', 10),
          channel_order: parseInt(c.channel_order || '0', 10),
        }));
      }
      return [];
    } catch (err) {
      console.warn(`[TS6WebQuery] Falha ao consultar canais reais (${(err as Error).message}). Usando canais de demonstração.`);
      return this.getMockChannels();
    }
  }

  /**
   * Obtém lista de clientes conectados
   */
  public async getClients(): Promise<TS6Client[]> {
    try {
      const result = await this.request<any>('clientlist', { '-voice': '', '-away': '' });
      let list: any[] = [];
      if (Array.isArray(result)) list = result;
      else if (result && Array.isArray(result.data)) list = result.data;
      else if (result && Array.isArray(result.body)) list = result.body;

      if (list.length > 0) {
        return list.map((u: any) => ({
          clid: parseInt(u.clid, 10),
          cid: parseInt(u.cid, 10),
          client_nickname: u.client_nickname,
          client_type: parseInt(u.client_type || '0', 10),
          client_is_talking: u.client_flag_talking === '1' || u.client_is_talking === '1' || u.client_is_talking === true,
          client_input_muted: u.client_input_muted === '1' || u.client_input_muted === true,
          client_output_muted: u.client_output_muted === '1' || u.client_output_muted === true,
        }));
      }
      return [];
    } catch (err) {
      console.warn(`[TS6WebQuery] Falha ao consultar clientes reais (${(err as Error).message}).`);
      return [];
    }
  }

  /**
   * Move um cliente para um canal específico no servidor
   */
  public async moveClient(clid: number, cid: number): Promise<boolean> {
    try {
      await this.request<any>('clientmove', { clid, cid });
      return true;
    } catch (err) {
      console.warn(`[TS6WebQuery] Não foi possível mover cliente no TS6 nativo: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Mock de canais para quando o servidor estiver inicializando ou offline
   */
  public getMockChannels(): TS6Channel[] {
    return [
      { cid: 1, pid: 0, channel_name: 'Lobby Principal', channel_topic: 'Bem-vindo ao TeamSpeak 6 WebClient', total_clients: 0 },
      { cid: 2, pid: 0, channel_name: 'Jogos / Geral', channel_topic: 'Bate-papo livre', total_clients: 0 },
      { cid: 3, pid: 0, channel_name: 'Sala de Música 🎵', channel_topic: 'Músicas e streams', total_clients: 0 },
      { cid: 4, pid: 0, channel_name: 'AFK / Ausente 💤', channel_topic: 'Usuários inativos', total_clients: 0 },
    ];
  }
}
