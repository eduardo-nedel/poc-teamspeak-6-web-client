export interface Channel {
  cid: number;
  pid: number;
  channel_name: string;
  channel_topic?: string;
  total_clients?: number;
}

export interface User {
  id: string;
  nickname: string;
  channelId: number;
  isMuted: boolean;
  isDeafened: boolean;
  isTalking: boolean;
  isNativeTS6?: boolean;
  connectedAt?: string;
}

export interface ServerInfo {
  virtualServerName: string;
  host: string;
  ping: number;
}
