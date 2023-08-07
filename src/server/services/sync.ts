import axios from "axios";
import { Connection, Transaction, transactions } from "../models";
import * as con from "./connections";
import * as crypto from 'crypto'
import * as configs from '../configs';

const _sync = {
  isRunning: false
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
  c.influence = (weight + (weight * connectionAge/serverAge))/2;

  if (c.id != configs.CONNECTIONS_SERVER_ID && c.id != '@root' && c.id != configs.SERVER_ID && connectionAge > 10)
  {
    const recentRewardTx = transactions.find((t) => t.from == configs.SERVER_ID && t.to == c.id && t.time > now - 10000);
    if (!recentRewardTx) {
      const reward = .0001;
      // console.log(`${c.id}\
      //   \nweight: ${weight}, serverAge: ${serverAge}s, connectionAge: ${connectionAge}s, \
      //   \nconnectionWeight: ${connectionAge / serverAge}, influence: ${influence.toFixed(1)}`);
      console.log(`${c.id} influence ${(c.influence*100).toFixed(1)}%`);
      const prob = .1 + c.influence;

      if (_isStrike(prob)) {
        console.log(`!!*#*#*STRIKE*#*#*!!`);

        transactions.push({
          id: crypto.randomUUID(),
          from: configs.SERVER_ID,
          to: c.id,
          amount: reward,
          message: `connection reward strike at ${(prob*100).toFixed(1)}%`,
          time: new Date().getTime()
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

  let allPeerConnections: Connection[] = [];
  let connectionsPromises: Promise<void>[] = [];

  let allPeerTransactions: Transaction[] = [];
  let transactionsPromises: Promise<void>[] = [];

  con.connections.forEach(async (c) => {
    if (!c.url || c.url == configs.SERVER_URL) return;

    console.log(`hadnling sync from ${c.id}(${c.url})..`);
    const connectionsPromise = axios
      .get(`http://${c.url}/connections?id=${configs.SERVER_ID}&url=${configs.SERVER_URL}`)
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
      .catch((e) => {});

    connectionsPromises.push(connectionsPromise);
    
    const transactionsPromise = axios
      .get(`http://${c.url}/transactions?id=${configs.SERVER_ID}`)
      .then((res) => {
        let peerTransactions: Transaction[] = res.data;
        peerTransactions.forEach((pt) => {
          let apt = allPeerTransactions.find((apt) => pt.id == apt.id);
          if (!apt) {
            allPeerTransactions.push(pt);
          } else {
            // throw error if mismatch
          }
        });
      })
      .catch((e) => {});

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
    console.log(
      `..all peer transactions call loaded...${transactionsPromises.length}`
    );

    allPeerTransactions.forEach((pt) => {
      let t = transactions.find((t) => t.id == pt.id);
      if (!t) {
        transactions.push(pt);
      } else {
        // throw error if mismatch
      }
    });
  });

  if (connectionsPromises.length > 0 || transactionsPromises.length > 0) {
    Promise.all([connectionsPromises, transactionsPromises]).finally(() => {
      _sync.isRunning = false;
      console.log(`full sync completed for ${connectionsPromises.length} connections.. waiting for next sync..`);
    })
  } else {
    _sync.isRunning = false;
    console.log(`full sync completed without connections.. waiting for next sync..`);
  }
}

export function start() {
  con.start();

  // connection sync process
  axios.get(`http://${con.connections[0].url}/connections?id=${configs.SERVER_ID}&url=${configs.SERVER_URL}`)
    .then((res) => {
      const connection: Connection = res.data[0];
      con.connections[0].registeredTime = connection.registeredTime;
    }).catch(e => {
    });

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