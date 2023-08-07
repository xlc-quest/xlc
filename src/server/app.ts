import * as express from 'express';
import apiRouter from './routes';
//import bodyParser from 'body-parser';
import axios from 'axios';
import * as crypto from 'crypto'

import {Connection, Transaction} from './models';
import * as models from './models';
import { configs } from '../configs';
import * as con from './services/connections';

const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(apiRouter);

app.listen(con.SERVER_PORT, () => console.log(`server listening on port: ${con.SERVER_PORT}..`));

con.addExtendConnections(con.SERVER_ID, configs.url);
setInterval(() => {
  console.log(
    `updating connections for sever '${con.SERVER_ID}'..`
  );
  con.addExtendConnections(con.SERVER_ID, configs.url);
}, 4000);
