import * as express from 'express';
import apiRouter from './routes';
import * as env from './env';
import * as sync from './services/sync';
import { configs } from '../client/configs';

const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(apiRouter);

app.listen(env.SERVER_PORT, () => console.log(`server listening on port: ${env.SERVER_PORT}..`));
configs.serverId = env.SERVER_ID;
configs.serverUrl = env.SERVER_URL;

sync.startSync();