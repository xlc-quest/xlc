import * as express from 'express';
import { Transaction } from './models';
import * as models from './models';
import * as crypto from 'crypto';

const router = express.Router();

router.get('/api/hello', (req, res, next) => {
    res.json('..xlc');
});

router.get('/connections', (req, res) => {
    res.status(200).json(
        models.addExtendConnections(
          req.query.id ? req.query.id.toString() : `ANN${new Date().getTime()}`,
          req.query.url ? req.query.url.toString() : undefined
        )
      );
});
  
router.get('/transactions', (req, res) => {
    res.status(200).json(models.transactions);
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
        time: new Date(),
    };

    models.transactions.push(transaction);

    res.status(200).json(models.transactions);
});

export default router;