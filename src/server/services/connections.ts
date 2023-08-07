import * as configs from '../configs';
import { Connection } from "../models";

export const connections: Connection[] = [
  {
    id: configs.CONNECTIONS_SERVER_ID,
    registeredTime: configs.PUBLIC_PORTS.includes(configs.SERVER_PORT) ? new Date().getTime() : undefined,
    url: configs.SERVER_URL,
  }
];

const _sync = {
  isRunning: false
}

export function _extendConnections(id: string, url?: string): Connection[] {
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

export function updateLocalConnections(now: number) {
  let index = connections.findIndex((c) => c.id != configs.CONNECTIONS_SERVER_ID && c.expiry && c.expiry < now);
  while (index > -1) {
    console.log(`removing inactive connection... ${connections[index].id}`);
    connections.splice(index, 1);
    index = connections.findIndex((c) => c.id != configs.CONNECTIONS_SERVER_ID && c.expiry && c.expiry < now);
  }
}

export function start() {
  _extendConnections(configs.SERVER_ID, configs.SERVER_URL);
  setInterval(() => {
    if (_sync.isRunning) {
      console.log(`connections sync is already running.. skipping..`);
      return;
    }

    console.log(`updating connections for sever '${configs.SERVER_ID}'..`);
    _extendConnections(configs.SERVER_ID, configs.SERVER_URL);

    _sync.isRunning = false;
    console.log(`connections sync process completed.. waiting for next sync..`);
  }, 4000);
}