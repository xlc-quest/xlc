import * as express from 'express';
import * as models from './models';
import * as crypto from 'crypto';
import { _extendConnections, connections } from './services/connections';
import * as env from './env';
import axios from 'axios';
import * as transactions from './services/transactions';
import * as rewards from './services/rewards';

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
        const balance = transactions.getBalance(clientId);

        return res.status(200).json({
            id: clientId,
            balance: {
                total: balance,
                fromAmount: fromAmount,
                toAmount: toAmount,
            },
            transactions: transactions.getSummary(clientId)
        });
    } else {
        let filteredTxs = transactions.getAll();

        if (req.query.by) {
            const serverId = String(req.query.by);
            filteredTxs = filteredTxs.filter(t => t.by == serverId);
        }

        if (req.query.from) {
            const from = Number(req.query.from);
            filteredTxs = filteredTxs.filter(t => from <= t.time);
        }
    
        if (req.query.to) {
            const to = Number(req.query.to);
            filteredTxs = filteredTxs.filter(t => t.time <= to);
        }

        if (req.query.id && String(req.query.id) != '@root') {
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
        time: new Date().getTime(),
        by: env.SERVER_ID
    };

    if (transactions.addTransaction(transaction)) {
        res.status(200).json(transaction);
    } else {
        res.status(400).json(`Invalid transaction`);
    }
});

export default router;