import * as express from 'express';
import apiRouter from './routes';
//import bodyParser from 'body-parser';
import axios from 'axios';
import * as crypto from 'crypto'

import {Connection, Transaction} from './models';
import * as models from './models';

// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import * as crypto from 'crypto';


const app = express();

app.use(express.static('public'));
app.use(express.json());
//app.use(bodyParser.json());
app.use(apiRouter);

//const port = process.env.PORT || 3000;
const serverUrl = '127.0.0.1:' + models.serverPort;
const serverId = ['3000', '80', '8080'].includes(models.serverPort) ? models.CONNECTION_SERVER_ID : '@server:' + models.serverPort;

app.listen(models.serverPort, () => console.log(`server listening on port: ${models.serverPort}..`));

function isTrue(probability: number) {
  return !!probability && Math.random() <= probability;
};

// connection sync process
axios.get(`http://${models.connections[0].url}/connections?id=${serverId}&url=${serverUrl}`)
  .then((res) => {
    const connection: Connection = res.data[0];
    models.connections[0].registeredTime = connection.registeredTime;
  }).catch(e => {
  });

setInterval(() => {
  console.log(`..connections: ${models.connections.length}.. next check in 5s..`);

  const now = new Date().getTime();
  models.removeInactiveConnections(now);

  const startTime = models.connections[0].registeredTime;
  if (!startTime) {
    console.warn(`server start time not set yet..`);
    return;
  }

  models.connections.forEach(c => {
    if (!c.registeredTime) return;

    const connectionAge = (now - c.registeredTime)/1000;
    const weight = (1/models.connections.length);
    const serverAge = (now - startTime)/1000;
    c.influence = (weight + (weight * connectionAge/serverAge))/2;

    if (c.id != models.CONNECTION_SERVER_ID && c.id != '@root' && c.id != serverId && connectionAge > 10)
    {
      // console.log(`Connection age bonus to be implemented.. ${connectionAge}s`);
      const recentRewardTx = models.transactions.find((t) => t.from == serverId && t.to == c.id && t.time > now - 10000);
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

          models.transactions.push({
            id: crypto.randomUUID(),
            from: serverId,
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

  models.connections.forEach(async (c) => {
    if (!c.url || c.url == serverUrl) return;

    console.log(`hadnling sync from ${c.id}(${c.url})..`);
    const connectionsPromise = axios
      .get(`http://${c.url}/connections?id=${serverId}&url=${serverUrl}`)
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
      .get(`http://${c.url}/transactions?id=${serverId}`)
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
      let c = models.connections.find((c) => c.id == pc.id);
      if (!c) {
        models.connections.push(pc);
      } else {
        if (c.expiry && pc.expiry && c.expiry < pc.expiry) {
          c.expiry = pc.expiry;
          c.influence = pc.influence? pc.influence : undefined;
        }
      }
    });

    models.removeInactiveConnections(now);
  });

  Promise.all(transactionsPromises).then(() => {
    console.log(
      `..all peer transactions call loaded...${transactionsPromises.length}`
    );

    allPeerTransactions.forEach((pt) => {
      let t = models.transactions.find((t) => t.id == pt.id);
      if (!t) {
        models.transactions.push(pt);
      } else {
        // throw error if mismatch
      }
    });
  });
}, 5000);

// local block process
models.addExtendConnections(serverId, serverUrl);
setInterval(() => {
  console.log(
    `updating connections for sever '${serverId}'..`
  );
  models.addExtendConnections(serverId, serverUrl);
}, 4000);
