import axios from "axios";
import { Connection, Contract, Transaction } from "./models";
import * as con from "./services/connections";
import * as crypto from 'crypto'
import * as env from './env';
import * as fs from 'fs';
import * as lockfile from 'proper-lockfile';
import * as transactions from './services/transactions';
import * as rewards from './services/rewards';
import { RewardType } from "./services/rewards";
import * as contracts from './services/contracts';

const _sync = {
  isRunning: true,
  lastTxFileTime: 0,
  lastTxSyncTime: <{ [key: string]: number }>{},
  lastContractSyncTime: <{ [key: string]: number }>{}
}

export function startAsync(): Promise<void> {
  const now = new Date().getTime();

  console.log(`setting up initial connections..`);
  return axios.request({
    timeout: 2000,
    method: "GET",
    url: `${con.connections[0].url}/connections?id=${env.SERVER_ID}&url=${env.SERVER_URL}`})
  .then((res) => {
    const connection: Connection = res.data[0];
    con.connections[0].registeredTime = connection.registeredTime || now;


    _sync.lastTxFileTime = transactions.restoreFromFiles(con.connections[0].registeredTime);

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
  }).catch(e => {
    console.log(e);
    console.error(`failed to connect. please check @connections server`);
    return;
  }).finally(() => {
    _sync.isRunning = false;
  });
}

function _updateInfluence(c: Connection, connectionAge: number) {
  const startTime = con.connections[0].registeredTime;
  if (!startTime) {
    console.warn(`connection server start time not set.. skipping..`);
    _sync.isRunning = false;
    return;
  }

  if (!c.registeredTime) return;

  const now = new Date().getTime();
  const weight = (1/con.connections.length);
  const serverAge = now - startTime;
  c.influence = connectionAge > serverAge ? weight : (weight + (weight * connectionAge/serverAge))/2;
}

function _onSync() {
  con.updateLocalConnections();
  
  if (_sync.isRunning) {
    console.log(`full sync is already running.. skipping..`);
    return;
  }

  _sync.isRunning = true;

  console.log(`starting full sync on connections: ${con.connections.length}..`);
  const now = new Date().getTime();
  con.connections.forEach(c => {
    if (!c.registeredTime) return;

    const connectionAge = now - c.registeredTime;
    _updateInfluence(c, connectionAge);
    if ((c.to == env.SERVER_ID || env.SERVER_ID == env.CONNECTION_SERVER_ID) &&
      connectionAge > rewards.TRIAL_CADENCE &&
      c.id != env.CONNECTION_SERVER_ID &&
      c.id != '@root' &&
      c.id != env.SERVER_ID) {
      rewards.tryPost(c, RewardType.CONNECTION);
    }
  });

  const allPeerConnections: Connection[] = [];
  const connectionsPromises: Promise<void>[] = [];

  const allPeerTransactions: Transaction[] = [];
  const transactionsPromises: Promise<void>[] = [];

  const allPeerContracts: Contract[] = [];
  const contractsPromises: Promise<void>[] = [];

  con.connections.forEach(async (c) => {
    if (!c.url || c.url == env.SERVER_URL || c.url.includes('localhost') || c.url.includes('127.0.0.1')) return;

    console.log(`hadnling sync from ${c.id}(${c.url})..`);
    const connectionsPromise = axios
      .request({
        timeout: 2000,
        method: "GET",
        url: `${c.url}/connections?id=${env.SERVER_ID}&url=${env.SERVER_URL}`})
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
        console.warn(`error thrown during GET ${c.url}/connections?id=${env.SERVER_ID}&url=${env.SERVER_URL}`);
        con.updateLocalConnections();
      });

    connectionsPromises.push(connectionsPromise);
    
    if (!_sync.lastTxSyncTime[c.id] && _sync.lastTxFileTime > 0) {
      console.log(`setting last sync time of ${c.id}(${c.url}) to file time ${_sync.lastTxFileTime}..`);
      _sync.lastTxSyncTime[c.id] = _sync.lastTxFileTime;
    }

    const transactionsUrl = `${c.url}/transactions${_sync.lastTxSyncTime[c.id] ?
      `?from=${(_sync.lastTxSyncTime[c.id])}&` : `?`}all=true`;

    const transactionsPromise = axios
      .request({
        timeout: 5000,
        method: "GET",
        url: transactionsUrl})
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

        const lastSyncTime = peerTransactions.reduce((time, t) => {
          return time < t.time ? t.time : time;
        }, 0);
        _sync.lastTxSyncTime[c.id] = lastSyncTime;
      })
      .catch((e) => {
        console.log(e);
        console.warn(`error thrown during GET ${transactionsUrl}`);
        con.updateLocalConnections();
      });

    transactionsPromises.push(transactionsPromise);

    const contractsUrl = `${c.url}/contracts${_sync.lastContractSyncTime[c.id] ?
      `?from=${(_sync.lastContractSyncTime[c.id])}&` : `?`}all=true`;

    const contractsPromise = axios
      .request({
        timeout: 5000,
        method: "GET",
        url: contractsUrl})
      .then((res) => {
        let peerContracts: Contract[] = res.data;
        console.log(`received ${peerContracts.length} contracts..`);

        peerContracts.forEach((pc) => {
          let apc = allPeerContracts.find((apc) => pc.id == apc.id);
          if (!apc) {
            allPeerContracts.push(pc);
          } else {
            // throw error if mismatch
          }
        });

        const lastSyncTime = allPeerContracts.reduce((time, c) => {
          const lasUpdatedTime = c.times.length > 0 ? c.times[c.times.length-1] : 0;
          return time > lasUpdatedTime ? time : lasUpdatedTime;
        }, 0);
        _sync.lastContractSyncTime[c.id] = lastSyncTime;
      })
      .catch((e) => {
        console.log(e);
        console.warn(`error thrown during GET ${contractsUrl}`);
        con.updateLocalConnections();
      });

    contractsPromises.push(contractsPromise);
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
  });
  
  Promise.all(transactionsPromises).then(() => {
    console.log(`..processing ${allPeerTransactions.length} new peer transactions..`);

    const newTxs = allPeerTransactions.reduce((txs: Transaction[], t) => {
      if (!transactions.getOne(t.id)) {
        txs.push(t);
      }
      return txs;
    }, []);

    const newCount = transactions.onReceivedPeerTransactions(newTxs);
    if (newTxs.length != newCount) {
      console.warn(`new transactions mismatch, could be racing condition..`);
    }

    console.log(`..added ${newCount} new transactions..`);
  });

  Promise.all(contractsPromises).then(() => {
    console.log(`..processing ${allPeerContracts.length} contract updates..`);

    const updatedContracts = allPeerContracts.reduce((updates: Contract[], t) => {
      if (!contracts.getOne(t.id)) {
        updates.push(t);
      }
      return updates;
    }, []);

    const updatedCount = contracts.onReceivedPeerContracts(updatedContracts);
    if (updatedContracts.length != updatedCount) {
      console.warn(`updated contracts mismatch, could be racing condition..`);
    }

    console.log(`..updated ${updatedCount} contracts..`);
  });

  if (connectionsPromises.length > 0 || transactionsPromises.length > 0 || contractsPromises.length > 0) {
    Promise.all([...connectionsPromises, ...transactionsPromises, ...connectionsPromises]).finally(() => {
      _onPostSync();
      console.log(`full sync completed for ${connectionsPromises.length} connections.. ${transactions.getLength()} txs.. ${contracts.getLength()} contracts..`);
    })
  } else {
    _onPostSync();
    console.log(`full sync completed without connections.. waiting for next sync..`);
  }
}

function _onPostSync() {
  _sync.isRunning = false;
  con.updateLocalConnections();
  const lastTx = transactions.getLast();
  const validateToTime = !lastTx ? 0 : lastTx.time - 1000; // -1 s from the last tx time
  if (validateToTime > 0 && env.SERVER_ID != env.CONNECTION_SERVER_ID) {
    const validateFromTime = validateToTime - 60000; // look back -1 min
    const transactionsUrl = `${con.connections[0].url}/transactions?from=${validateFromTime}&to=${validateToTime}&all=true`;

    axios.request({
      timeout: 2000,
      method: "GET",
      url: transactionsUrl})
    .then((res) => {
      const serverTxs: Transaction[] = res.data;
      const localTxs = transactions.getRange(validateFromTime, validateToTime);

      if (serverTxs.length != localTxs.length) {
        throw `mismatch at server ${serverTxs.length} txs, local ${localTxs.length} txs, check sync logic!`;
      }

      for (let i=0; i<serverTxs.length; i++) {
        if (serverTxs[i].id != localTxs[i].id) {
          throw `mismatch at server id '${serverTxs[i].id}', local id '${localTxs[i].id}', check sync logic!`;
        }
      }

      console.log(`validated ${serverTxs.length} txs from ${validateFromTime} to ${validateToTime}`);
      transactions.onPostSync();
    })
    .catch((e) => {
      console.log(e);
      console.warn(`error thrown during GET ${transactionsUrl}`);
    });
  }
}