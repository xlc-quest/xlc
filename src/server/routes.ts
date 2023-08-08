import * as express from 'express';
import * as models from './models';
import * as crypto from 'crypto';
import { _extendConnections } from './services/connections';

const router = express.Router();

router.get('/api/hello', (req, res, next) => {
    res.json('..xlc');
});

router.get('/connections', (req, res) => {
    res.status(200).json(
        _extendConnections(
          req.query.id ? req.query.id.toString() : `ANN${new Date().getTime()}`,
          req.query.url ? req.query.url.toString() : undefined
        )
      );
});
  
router.get('/transactions', (req, res) => {
    let filteredTxs = models.transactions.filter(t => true); // TODO
    if (req.query.from) {
        const from = Number(req.query.from);
        filteredTxs = filteredTxs.filter(t => from <= t.time);
    }

    if (req.query.to) {
        const to = Number(req.query.to);
        filteredTxs = filteredTxs.filter(t => t.time <= to);
    }

    return res.status(200).json(filteredTxs);
});
  
router.post('/transactions', (req, res) => {
    if (
        !req.body.from ||
        !req.body.to ||
        (!req.body.amount && !req.body.message)
    ) {
        console.log(req.body);
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

    models.transactions.push(transaction);

    res.status(200).json(models.transactions);
});

export default router;