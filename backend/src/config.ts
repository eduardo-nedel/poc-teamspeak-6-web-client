import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  TS6_HOST: process.env.TS6_HOST || '127.0.0.1',
  TS6_VOICE_HOST: process.env.TS6_VOICE_HOST || '127.0.0.1',
  TS6_VOICE_PORT: parseInt(process.env.TS6_VOICE_PORT || '9987', 10),
  TS6_SERVER_PASSWORD: process.env.TS6_SERVER_PASSWORD || '',
  TS6_WEBQUERY_PORT: parseInt(process.env.TS6_WEBQUERY_PORT || '10080', 10),
  TS6_API_KEY: process.env.TS6_API_KEY || '',
  TS6_SERVER_ID: parseInt(process.env.TS6_SERVER_ID || '1', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
