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
const serverId = models.serverPort == models.CONNECTION_PORTS[0] ? models.CONNECTION_SERVER_ID : '@server:' + models.serverPort;

app.listen(models.serverPort, () => console.log(`Server listening on port: ${models.serverPort}`));

function isTrue(probability: number) {
  return !!probability && Math.random() <= probability;
};

// connection sync process
setInterval(() => {
  console.log(`Connections: ${models.connections.length}.. Next check in 5s...`);

  const now = new Date().getTime();
  models.removeInactiveConnections(now);

  models.connections.forEach(c => {
    const connectionAge = (now - c.registeredTime)/1000;

    if (c.id != models.CONNECTION_SERVER_ID && c.id != serverId && connectionAge > 10)
    {
      // console.log(`Connection age bonus to be implemented.. ${connectionAge}s`);
      const recentRewardTx = models.transactions.find((t) => t.from == serverId && t.to == c.id && t.time > now - 10000);
      if (!recentRewardTx) {
        const reward = .0001;
        const weighted = .49 + connectionAge/100000; // TODO: revisit algorithm
        const probability = weighted > .5 ? .5 : weighted;

        console.log(`Getting reward of x$${reward} with probability of ${(probability*100).toFixed(1)}%`);
        if (isTrue(probability)) {
          console.log(`Strike!`);

          models.transactions.push({
            id: crypto.randomUUID(),
            from: serverId,
            to: c.id,
            amount: reward,
            message: 'connection reward',
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
    if (!c.url) return;
    console.log(
      `Getting connections from server with address... ${c.id}(${c.url})`
    );

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
              apc.time = pc.time;
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
    console.log(`All peer connections call loaded...${connectionsPromises.length}`);
    allPeerConnections.forEach((ac) => {
      // const influence = ac.expiry? (ac.expiry - ac.registeredTime) * .0001 : 0;
      // console.log(influence % .01);

      let c = models.connections.find((c) => c.id == ac.id);
      if (!c) {
        models.connections.push(ac);
      } else {
        if (c.expiry && ac.expiry && c.expiry < ac.expiry) {
          c.expiry = ac.expiry;
          c.time = ac.time;
        }
      }
    });

    models.removeInactiveConnections(now);
  });

  Promise.all(transactionsPromises).then(() => {
    console.log(
      `All peer transactions call loaded...${transactionsPromises.length}`
    );

    allPeerTransactions.forEach((at) => {
      let t = models.transactions.find((t) => t.id == at.id);
      if (!t) {
        models.transactions.push(at);
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
    `Updating connections for sever '${serverId}' and starting block process...`
  );
  models.addExtendConnections(serverId, serverUrl);
}, 4000);
