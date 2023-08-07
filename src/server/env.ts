const IS_PROD = false;

export const CONNECTION_SERVER_ID = '@connections';
export const CONNECTION_SERVER_URLS = ['https://xlc.quest', 'http://localhost:3000'];
export const PUBLIC_PORTS = ['8080', '80'];
export const DEV_PORTS = ['3000', '3001', '3002'];

export const SERVER_PORT = process.env.PORT || process.argv[2] || '3000';
export const SERVER_ID = PUBLIC_PORTS.includes(SERVER_PORT) || (!IS_PROD && !process.argv[2]) ? CONNECTION_SERVER_ID : '@server:' + SERVER_PORT;
export const SERVER_URL = IS_PROD ? 'https://xlc.quest' : `http://localhost:${SERVER_PORT}`;