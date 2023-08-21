import axios from "axios";
import { Connection, Transaction } from "./models";
import * as con from "./services/connections";
import * as crypto from 'crypto'
import * as env from './env';
import * as fs from 'fs';
import * as lockfile from 'proper-lockfile';
import * as transactions from './services/transactions';

const _sync = {
  isRunning: true,
  lastTxSyncTime: <{ [key: string]: number }>{},
}

export function startSync() {
  console.log(`setting up initial connections..`);
  const now = new Date().getTime();

  axios.get(`${con.connections[0].url}/connections?id=${env.SERVER_ID}&url=${env.SERVER_URL}`)
  .then((res) => {
    const connection: Connection = res.data[0];
    con.connections[0].registeredTime = connection.registeredTime || now;
    transactions.onStart(con.connections[0].registeredTime);
  }).catch(e => {
    console.log(e);
    console.error(`failed to connect. please check @connections server`);
    return;
  }).finally(() => {
    _sync.isRunning = false;
  });

  // connection sync process
  con.startSync();

  setInterval(() => {
    try {
      _onSync();
    } catch (e) {
      console.log(e);
      _sync.isRunning = false;
      console.warn(`full sync crashed with error.. waiting for next sync..`);
    };
  }, 5000);
}

function _updateInfluence(c: Connection) {
  const startTime = con.connections[0].registeredTime;
  if (!startTime) {
    console.warn(`connection server start time not set.. skipping..`);
    _sync.isRunning = false;
    return;
  }

  const now = new Date().getTime();
  if (!c.registeredTime) return;

  const connectionAge = (now - c.registeredTime)/1000;
  const weight = (1/con.connections.length);
  const serverAge = (now - startTime)/1000;
  c.influence = connectionAge > serverAge ? weight : (weight + (weight * connectionAge/serverAge))/2;

  if (c.id != env.CONNECTION_SERVER_ID && c.id != '@root' && c.id != env.SERVER_ID && connectionAge > 10) {
    transactions.tryPostReward(c.id, c.influence);
  }
}

function _onSync() {
  const now = new Date().getTime();
  con.updateLocalConnections(now);
  
  if (_sync.isRunning) {
    console.log(`full sync is already running.. skipping..`);
    return;
  }

  _sync.isRunning = true;


  console.log(`starting full sync on connections: ${con.connections.length}..`);  
  con.connections.forEach(c => {
    _updateInfluence(c);
  });

  const allPeerConnections: Connection[] = [];
  const connectionsPromises: Promise<void>[] = [];

  const allPeerTransactions: Transaction[] = [];
  const transactionsPromises: Promise<void>[] = [];

  con.connections.forEach(async (c) => {
    if (!c.url || c.url == env.SERVER_URL || c.url.includes('localhost') || c.url.includes('127.0.0.1')) return;

    console.log(`hadnling sync from ${c.id}(${c.url})..`);
    const connectionsPromise = axios
      .get(`${c.url}/connections?id=${env.SERVER_ID}&url=${env.SERVER_URL}`)
      .then((res) => {
        let peerConnections: Connection[] = res.data;
        peerConnections.forEach((pc) => {
          let apc = allPeerConnections.find((apc) => pc.id == apc.id);
          if (!apc) {
            allPeerConnections.push(pc);
          } else {
            if (apc.expiry && pc.expiry && apc.expiry < pc.expiry) {
              apc.expiry = pc.expiry;
              apc.influence = pc.influence? pc.influence : undefined;
            }
          }
        });
      })
      .catch((e) => {
        console.log(e);
        console.warn(`error thrown during GET ${c.url}/connections`);
      });

    connectionsPromises.push(connectionsPromise);
    
    console.log(`last sync time of ${c.id}(${c.url}).. ${_sync.lastTxSyncTime[c.id]}`);
    const transactionsUrl = `${c.url}/transactions${_sync.lastTxSyncTime[c.id] ?
      `?from=${_sync.lastTxSyncTime[c.id]}&` : `?`}all=true`;

    const transactionsPromise = axios
      .get(transactionsUrl)
      .then((res) => {
        let peerTransactions: Transaction[] = res.data;
        console.log(`received ${peerTransactions.length} transactions..`);
        peerTransactions.forEach((pt) => {
          let apt = allPeerTransactions.find((apt) => pt.id == apt.id);
          if (!apt) {
            allPeerTransactions.push(pt);
          } else {
            // throw error if mismatch
          }
        });

        _sync.lastTxSyncTime[c.id] = now;
      })
      .catch((e) => {
        console.log(e);
        console.warn(`error thrown during GET ${c.url}/connections`);
      });

    transactionsPromises.push(transactionsPromise);
  });

  Promise.all(connectionsPromises).then(() => {
    console.log(`..all peer connections call loaded...${connectionsPromises.length}`);
    allPeerConnections.forEach((pc) => {
      let c = con.connections.find((c) => c.id == pc.id);
      if (!c) {
        con.connections.push(pc);
      } else {
        if (c.expiry && pc.expiry && c.expiry < pc.expiry) {
          c.expiry = pc.expiry;
          c.influence = pc.influence? pc.influence : undefined;
        }
      }
    });

    con.updateLocalConnections(now);
  });

  let newCount = 0;
  Promise.all(transactionsPromises).then(() => {
    console.log(`..processing ${allPeerTransactions.length} new peer transactions..`);
    newCount = transactions._onReceivedPeerTransactions(allPeerTransactions);
    console.log(`..added ${newCount} new transactions..`);
    return Promise.all(connectionsPromises);
  });

  if (connectionsPromises.length > 0 || transactionsPromises.length > 0) {
    Promise.all([...connectionsPromises, ...transactionsPromises]).finally(() => {
      _sync.isRunning = false;
      console.log(`full sync completed for ${connectionsPromises.length} connections.. ${transactions.getLength()} txs..`);
    })
  } else {
    _sync.isRunning = false;
    console.log(`full sync completed without connections.. waiting for next sync..`);
  }
}

