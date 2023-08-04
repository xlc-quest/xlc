export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount?: number;
    message?: string;
    time: Date;
}

export interface Connection {
    id: string;
    url?: string;
    expiry?: number;
}

export const CONNECTION_SERVER_ID = 'connections';
export const CONNECTION_PORTS = [
  '3000'
];

export const serverPort =
  process.env.PORT || process.argv[2] || CONNECTION_PORTS[0] || (Math.random() * 10000).toFixed(0);
  
export const connections: Connection[] = [
    {
      id: CONNECTION_SERVER_ID,
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
    if (connection) {
      connection.expiry = new Date().getTime() + 10000;
    } else {
      connections.push({
        id: id,
        url: url,
        expiry: new Date().getTime() + 10000,
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