import { configs } from "../../configs";
import { Connection } from "../models";

export const CONNECTIONS_SERVER_ID = '@connections';
export const PUBLIC_PORTS = ['3000', '80', '8080'];

export const SERVER_PORT = process.env.PORT || process.argv[2] || PUBLIC_PORTS[0];
export const SERVER_ID = PUBLIC_PORTS.includes(SERVER_PORT) ? CONNECTIONS_SERVER_ID : '@server:' + SERVER_PORT;
  
export const connections: Connection[] = [
  {
    id: CONNECTIONS_SERVER_ID,
    registeredTime: PUBLIC_PORTS.includes(SERVER_PORT) ? new Date().getTime() : undefined,
    url: configs.url,
  }
];

export function addExtendConnections(id: string, url?: string): Connection[] {
  let connection = connections.find(c => c.url == url && c.id != id);
  if (connection) {
    console.warn(`same url connection '${connection.id}' exists.. skipping '${id}'..`);
    return connections;
  }

  connection = connections.find((c) => c.id === id || c.url === url);
  const newExpiry = new Date().getTime() + 10000;

  if (connection) {
    connection.expiry = newExpiry;
  } else {
    connections.push({
      id: id,
      url: url,
      expiry: newExpiry,
      registeredTime: new Date().getTime(),
    });
  }

  return connections;
}

export function removeInactiveConnections(now: number) {
  let index = connections.findIndex((c) => c.id != CONNECTIONS_SERVER_ID && c.expiry && c.expiry < now);
  while (index > -1) {
    console.log(`removing inactive connection... ${connections[index].id}`);
    connections.splice(index, 1);
    index = connections.findIndex((c) => c.id != CONNECTIONS_SERVER_ID && c.expiry && c.expiry < now);
  }
}