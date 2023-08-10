import axios from "axios";
import { Connection, Transaction, transactions } from "../models";
import * as con from "./connections";
import * as crypto from 'crypto'
import * as env from '../env';
import * as fs from 'fs';

const _sync = {
  isRunning: true,
  lastTxSyncTime: <{ [key: string]: number }>{}
}

function _isStrike(probability: number) {
  return !!probability && Math.random() <= probability;
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

  if (c.id != env.CONNECTION_SERVER_ID && c.id != '@root' && c.id != env.SERVER_ID && connectionAge > 10)
  {
    const recentRewardTx = transactions.find((t) => t.from == env.SERVER_ID && t.to == c.id && t.time > now - 10000);
    if (!recentRewardTx) {
      const reward = Math.floor(Math.random() * 10)/10000;
      // console.log(`${c.id}\
      //   \nweight: ${weight}, serverAge: ${serverAge}s, connectionAge: ${connectionAge}s, \
      //   \nconnectionWeight: ${connectionAge / serverAge}, influence: ${c.influence.toFixed(1)}`);
      // console.log(`${c.id} influence ${(c.influence*100).toFixed(1)}%`);
      const prob = .1 + c.influence;

      if (_isStrike(prob)) {
        console.log(`!!*#*#*STRIKE*#*#*!!`);

        axios
        .post(`${con.connections[0].url}/transactions?id=${env.SERVER_ID}`, {
          from: env.SERVER_ID,
          to: c.id,
          amount: reward > 0 ? reward : .0001,
          message: `connection reward strike at ${(prob*100).toFixed(1)}%`,
        })
        .then((res) => {
          console.log(`posted a transaction from:${env.SERVER_ID} to ${con.connections[0].id}..`);
        })
        .catch((e) => {
          console.log(e);
          console.error(`failed to post a transaction from:${env.SERVER_ID} to ${con.connections[0].id}..`);
        });
      }
    }
  }
}

function _onSync() {
  if (_sync.isRunning) {
    console.log(`full sync is already running.. skipping..`);
    return;
  }

  _sync.isRunning = true;
  const now = new Date().getTime();
  con.updateLocalConnections(now);

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
    const transactionsUrl = `${c.url}/transactions?id=${env.SERVER_ID}${_sync.lastTxSyncTime[c.id] ?
      '&from='+(_sync.lastTxSyncTime[c.id]) : ''}&all=true`;

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

  Promise.all(transactionsPromises).then(() => {
    console.log(`..processing ${allPeerTransactions.length} new peer transactions..`);
    let count = 0;

    allPeerTransactions.forEach((pt) => {
      let t = transactions.find((t) => t.id == pt.id);
      if (!t) {
        transactions.push(pt);
        count++;
      } else {
        // throw error if mismatch
      }
    });

    console.log(`..added ${count} new transactions..`);
    transactions.sort((ta, tb) => (ta.time < tb.time ? -1 : 1)); // TODO: implement sorted list
  });

  if (connectionsPromises.length > 0 || transactionsPromises.length > 0) {
    Promise.all([...connectionsPromises, ...transactionsPromises]).finally(() => {
      _sync.isRunning = false;
      console.log(`full sync completed for ${connectionsPromises.length} connections.. ${transactions.length} txs..`);

      if (transactionsPromises.length > 0) {
        allPeerConnections.forEach(c => {
          _sync.lastTxSyncTime[c.id] = now;
        });
      }

      if (!transactions.length) {
        console.log(`no transactions to proceed.. skipping..`)
        return;
      }

      const lastTx = transactions[transactions.length-1];
      const dataRoot = `./data/transactions/${con.connections[0].registeredTime}`;
      
      if (!fs.existsSync(dataRoot)){
        fs.mkdirSync(dataRoot, { recursive: true });
      } else {
        const txFiles = fs.readdirSync(dataRoot);
        let lastTxSyncTime = txFiles.reduce((lastTxTime, t) =>  {
           const txTime = Number(t.split('-')[1]);
           return lastTxTime > txTime ? lastTxTime : txTime;
        }, 0);

        lastTxSyncTime = lastTxSyncTime > 0 ? lastTxSyncTime : transactions[0].time;

        const dataStoreCadence = 1200000;
        if (now - lastTxSyncTime > dataStoreCadence) {
          const txBlock = transactions.filter(t => t.time >= lastTxSyncTime);
          const count = txBlock.length;
          const dataPath = `${dataRoot}/${lastTxSyncTime}-${now}-${count}.json`;
          
          console.log(`storing data every ${dataStoreCadence/60000} mins.. ${dataPath}`);
          fs.writeFile(dataPath, JSON.stringify(txBlock), "utf8", () => {
          });
        }
      }
    })
  } else {
    _sync.isRunning = false;
    console.log(`full sync completed without connections.. waiting for next sync..`);
  }
}

export function startSync() {
  console.log(`setting up initial connections..`);
  const now = new Date().getTime();

  axios.get(`${con.connections[0].url}/connections?id=${env.SERVER_ID}&url=${env.SERVER_URL}`)
  .then((res) => {
    const connection: Connection = res.data[0];
    con.connections[0].registeredTime = connection.registeredTime || now;


    const dataRoot = `./data/transactions/${connection.registeredTime}`;
    if (!fs.existsSync(dataRoot)){
      fs.mkdirSync(dataRoot, { recursive: true });
      _sync.isRunning = false;
    } else {
      const txFiles = fs.readdirSync(dataRoot);
      let lastTxSyncTime = txFiles.reduce((lastTxTime, t) =>  {
         const txTime = Number(t.split('-')[1]);
         return lastTxTime > txTime ? lastTxTime : txTime;
      }, 0);

      for (let i=0; i<txFiles.length; i++) {
        const txFile = fs.readFileSync(`${dataRoot}/${txFiles[i]}`);
        const txJson = JSON.parse(txFile.toString());

        transactions.push(...txJson);
      }

      console.log(`restored ${transactions.length} txs from ${txFiles.length} files..`);
      _sync.lastTxSyncTime[connection.id] = lastTxSyncTime;
      _sync.isRunning = false;
    }
  }).catch(e => {
    console.log(e);
    console.error(`failed to connect. please check @connections server`);
    _sync.isRunning = false;
    return;
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