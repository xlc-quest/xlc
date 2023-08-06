import * as crypto from 'crypto'

export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount?: number;
    message?: string;
    time: number;
}

export interface Connection {
    id: string;
    registeredTime: number;
    time: number;
    url?: string;
    expiry?: number;
    influence?: number;
}

export const CONNECTION_SERVER_ID = '@connections';
export const CONNECTION_PORTS = [
  '3000'
];

export const serverPort =
  process.env.PORT || process.argv[2] || CONNECTION_PORTS[0] || (Math.random() * 10000).toFixed(0);
  
export const connections: Connection[] = [
  {
    id: CONNECTION_SERVER_ID,
    registeredTime: new Date().getTime(),
    time: new Date().getTime(),
    url: `127.0.0.1:${CONNECTION_PORTS[0]}`,
  }
];
  
export const transactions: Transaction[] = [];

export function addExtendConnections(id: string, url?: string): Connection[] {
  let connection = connections.find(c => c.url == url && c.id != id);
  if (connection) {
    console.warn(`Connection '${connection.id}' with same url already exists. Skipping '${id}'`);
    return connections;
  }

  connection = connections.find((c) => c.id === id || c.url === url);
  const newExpiry = new Date().getTime() + 10000;

  if (connection) {
    connection.expiry = newExpiry;
    connection.time = new Date().getTime();
  } else {
    connections.push({
      id: id,
      url: url,
      expiry: newExpiry,
      registeredTime: new Date().getTime(),
      time: new Date().getTime()
    });
  }

  return connections;
}

export function removeInactiveConnections(now: number) {
  let index = connections.findIndex((c) => c.expiry && c.expiry < now);
  while (index > -1) {
    console.log(`Removing inactive connection... ${connections[index].id}`);
    connections.splice(index, 1);
    index = connections.findIndex((c) => c.expiry && c.expiry < now);
  }
}