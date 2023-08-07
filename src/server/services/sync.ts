import axios from "axios";
import { configs } from "../../configs";
import { Connection, Transaction, transactions } from "../models";
import * as con from "./connections";

function isTrue(probability: number) {
  return !!probability && Math.random() <= probability;
};

// connection sync process
axios.get(`http://${con.connections[0].url}/connections?id=${con.SERVER_ID}&url=${configs.url}`)
  .then((res) => {
    const connection: Connection = res.data[0];
    con.connections[0].registeredTime = connection.registeredTime;
  }).catch(e => {
  });

setInterval(() => {
  console.log(`..connections: ${con.connections.length}.. next check in 5s..`);

  const now = new Date().getTime();
  con.removeInactiveConnections(now);

  const startTime = con.connections[0].registeredTime;
  if (!startTime) {
    console.warn(`server start time not set yet..`);
    return;
  }

  con.connections.forEach(c => {
    if (!c.registeredTime) return;

    const connectionAge = (now - c.registeredTime)/1000;
    const weight = (1/con.connections.length);
    const serverAge = (now - startTime)/1000;
    c.influence = (weight + (weight * connectionAge/serverAge))/2;

    if (c.id != con.CONNECTIONS_SERVER_ID && c.id != '@root' && c.id != con.SERVER_ID && connectionAge > 10)
    {
      // console.log(`Connection age bonus to be implemented.. ${connectionAge}s`);
      const recentRewardTx = transactions.find((t) => t.from == con.SERVER_ID && t.to == c.id && t.time > now - 10000);
      if (!recentRewardTx) {
        const reward = .0001;

        // console.log(`${c.id}\
        //   \nweight: ${weight}, serverAge: ${serverAge}s, connectionAge: ${connectionAge}s, \
        //   \nconnectionWeight: ${connectionAge / serverAge}, influence: ${influence.toFixed(1)}`);

        console.log(`${c.id} influence ${(c.influence*100).toFixed(1)}%`);
        //const weightedProb = .49 + connectionAge/100000; // TODO: revisit algorithm
        //const prob = weightedProb > .5 ? .5 : weightedProb;
        const prob = .1 + c.influence;

        // console.log(`Getting reward of x$${reward} with probability of ${(probability*100).toFixed(1)}%`);
        if (isTrue(prob)) {
          console.log(`!!*#*#*STRIKE*#*#*!!`);

          transactions.push({
            id: crypto.randomUUID(),
            from: con.SERVER_ID,
            to: c.id,
            amount: reward,
            message: `connection reward strike at ${(prob*100).toFixed(1)}%`,
            time: new Date().getTime()
          });
        }
      }
    }
  });

  let allPeerConnections: Connection[] = [];
  let connectionsPromises: Promise<void>[] = [];

  let allPeerTransactions: Transaction[] = [];
  let transactionsPromises: Promise<void>[] = [];

  con.connections.forEach(async (c) => {
    if (!c.url || c.url == configs.url) return;

    console.log(`hadnling sync from ${c.id}(${c.url})..`);
    const connectionsPromise = axios
      .get(`http://${c.url}/connections?id=${con.SERVER_ID}&url=${configs.url}`)
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
      .get(`http://${c.url}/transactions?id=${con.SERVER_ID}`)
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

    con.removeInactiveConnections(now);
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
}, 5000);