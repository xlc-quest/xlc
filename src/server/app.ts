import * as express from 'express';
import apiRouter from './routes';
import * as configs from './env';
import * as sync from './services/sync';

const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(apiRouter);

app.listen(configs.SERVER_PORT, () => console.log(`server listening on port: ${configs.SERVER_PORT}..`));

sync.start();