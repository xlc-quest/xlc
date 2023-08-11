import * as express from 'express';
import * as models from './models';
import * as crypto from 'crypto';
import { _extendConnections, connections } from './services/connections';
import * as env from './env';
import axios from 'axios';

const router = express.Router();

router.get('/connections', (req, res) => {
    res.status(200).json(
        _extendConnections(
          req.query.id ? req.query.id.toString() : `ANN${new Date().getTime()}`,
          req.query.url ? req.query.url.toString() : undefined
        )
      );
});
  
router.get('/transactions', (req, res) => {
    if (req.query.summary && String(req.query.summary).toLowerCase() == 'true') {
        const clientId = req.query.id && String(req.query.id) ? String(req.query.id) : env.SERVER_ID;

        let toAmount = 0;
        let fromAmount = 0;
        const balance = models.transactions.reduce((sum, t) => {
            sum += t.to == clientId ? Number(t.amount) : 0;
            sum += t.from == clientId ? -1*Number(t.amount) : 0;
            
            toAmount += t.to == clientId ? Number(t.amount) : 0;
            fromAmount += t.from == clientId ? Number(t.amount) : 0;
            return sum;
        }, 0);

        return res.status(200).json({
            id: clientId,
            balance: {
                total: balance,
                fromAmount: fromAmount,
                toAmount: toAmount,
            },
            transactions: {
                from: models.transactions.filter(t => t.from == clientId).length,
                to: models.transactions.filter(t => t.to == clientId).length,
                mine: models.transactions.filter(t => t.from == clientId || t.to == clientId).length,
                all: models.transactions.length
            }
        });
    } else {
        let filteredTxs = models.transactions.filter(t => true); // TODO
        if (req.query.from) {
            const from = Number(req.query.from);
            filteredTxs = filteredTxs.filter(t => from <= t.time);
        }
    
        if (req.query.to) {
            const to = Number(req.query.to);
            filteredTxs = filteredTxs.filter(t => t.time <= to);
        }

        if (req.query.id) {
            const clientId = String(req.query.id);
            filteredTxs = filteredTxs.filter(t => t.from == clientId || t.to == clientId);
        }

        if (req.query.filter) {
            const filter = String(req.query.filter);
            filteredTxs = filteredTxs.filter(t =>
                t.id?.includes(filter) ||
                t.from?.includes(filter) ||
                t.to?.includes(filter) ||
                t.message?.includes(filter))
        }
    
        const pageSize = 1000;
        let sliceFrom = 0;
        let sliceTo = filteredTxs.length > 0 ? filteredTxs.length : 0;
        if (!req.query.all || String(req.query.all).toLowerCase() != 'true') {
            sliceFrom = filteredTxs.length > pageSize ? filteredTxs.length - pageSize : 0;
        }
    
        return res.status(200).json(filteredTxs.slice(sliceFrom, sliceTo));
    }
});
  
router.post('/transactions', (req, res) => {
    if (
        !req.body.from ||
        !req.body.to ||
        (!req.body.amount && !req.body.message)
    ) {
        res.status(400).json({ error: `Invalid request body sent.` });
        return;
    }

    let transaction = {
        id: crypto.randomUUID(),
        from: req.body.from,
        to: req.body.to,
        amount: req.body.amount,
        message: req.body.message,
        time: new Date().getTime()
    };

    if (env.SERVER_ID != env.CONNECTION_SERVER_ID) {
        axios
        .post(`${connections[0].url}/transactions?id=${env.SERVER_ID}`, transaction)
        .then((res) => {
          console.log(`posted a transaction from:${env.SERVER_ID} to ${connections[0].id}..`);
        })
        .catch((e) => {
          console.log(e);
          console.error(`failed to post a transaction from:${env.SERVER_ID} to ${connections[0].id}..`);
        });
    } else {
        models.transactions.push(transaction);
    }

    res.status(200).json(transaction);
});

export default router;