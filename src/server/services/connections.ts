import * as env from '../env';
import { Connection } from "../models";

export const connections: Connection[] = [
  {
    id: env.CONNECTION_SERVER_ID,
    url: env.CONNECTION_SERVER_URLS[0],
  }
];

const _sync = {
  isRunning: false
}

export function _extendConnections(id: string, url?: string): Connection[] {
  if (!id.startsWith('@')) {
    console.warn(`skipping unsupported clinent id '${id}'..`);
    return connections;
  }

  let connection = connections.find(c => c.id !== id && c.url && c.url == url);
  if (connection) {
    console.warn(`same url connection '${connection.id}' exists.. skipping '${id}'..`);
    return connections;
  }

  if (id == env.CONNECTION_SERVER_ID && connections[0].url == env.SERVER_URL) {
    console.log(`setting up the first @connections..`);
    connections[0].registeredTime = new Date().getTime();
    return connections;
  }

  const newExpiry = new Date().getTime() + 10000;
  connection = connections.find((c) => c.id === id && c.url === url && c.registeredTime);
  if (connection) {
    connection.expiry = newExpiry;
    return connections;
  }

  console.log(`..adding new connection ${id}(${url})`);
  connections.push({
    id: id,
    url: url,
    expiry: newExpiry,
    registeredTime: new Date().getTime(),
  });

  return connections;
}

export function updateLocalConnections(now: number) {
  let index = connections.findIndex((c) => c.id != env.CONNECTION_SERVER_ID && c.expiry && c.expiry < now);
  while (index > -1) {
    console.log(`removing inactive connection... ${connections[index].id}`);
    connections.splice(index, 1);
    index = connections.findIndex((c) => c.id != env.CONNECTION_SERVER_ID && c.expiry && c.expiry < now);
  }
}

export function startSync() {
  _extendConnections(env.SERVER_ID, env.SERVER_URL);
  setInterval(() => {
    if (_sync.isRunning) {
      console.log(`connections sync is already running.. skipping..`);
      return;
    }

    console.log(`updating connections for sever '${env.SERVER_ID}(${env.SERVER_URL})'..`);
    _extendConnections(env.SERVER_ID, env.SERVER_URL);

    _sync.isRunning = false;
    console.log(`connections sync process completed.. waiting for next sync..`);
  }, 4000);
}