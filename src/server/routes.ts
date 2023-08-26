import * as express from 'express';
import * as models from './models';
import * as crypto from 'crypto';
import { _extendConnections, connections } from './services/connections';
import * as env from './env';
import axios from 'axios';
import * as transactions from './services/transactions';
import * as rewards from './services/rewards';
import * as contracts from './services/contracts';

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
        if (!req.query.all || String(req.query.all).toLowerCase() != 'true') {
            const sliceFrom = filteredTxs.length > pageSize ? filteredTxs.length - pageSize : 0;
            const sliceTo = filteredTxs.length > 0 ? filteredTxs.length : 0;

            filteredTxs = filteredTxs.slice(sliceFrom, sliceTo);

            if (req.query.contracts && String(req.query.contracts).toLowerCase() == 'true') {
                for (let i=0; i<filteredTxs.length; i++) {
                    filteredTxs[i].contracts = contracts.getByTxId(filteredTxs[i].id, true);
                }
            }
        }
    
        return res.status(200).json(filteredTxs);
    }
});
  
router.post('/transactions', (req, res) => {
    if (!req.body.from ||
        !req.body.to ||
        (!req.body.amount && !req.body.message)
    ) {
        res.status(400).json({ error: `invalid request body sent.` });
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

router.get('/contracts', (req, res) => {
    let filteredContracts = contracts.getAll();

    if (req.query.by) {
        const serverId = String(req.query.by);
        filteredContracts = filteredContracts.filter(c => c.by == serverId);
    }

    if (req.query.from) {
        const from = Number(req.query.from);
        filteredContracts = filteredContracts.filter(c => from <= c.updatedTime);
    }

    if (req.query.to) {
        const to = Number(req.query.to);
        filteredContracts = filteredContracts.filter(c => c.updatedTime <= to);
    }

    res.status(200).json(filteredContracts);
});

router.post('/contracts', (req, res) => {
    const contractType = req.body.type ? String(req.body.type).toLowerCase() : '';
    if (!contractType || !(contractType == 'responses' || contractType == 'comments')) {
        res.status(400).json({ error: `invalid contract type.` });
        return;
    }

    const txId = req.body.txId ? String(req.body.txId) : '';
    const tx = txId ? transactions.getOne(txId) : undefined;
    if (!tx) {
        res.status(400).json({ error: `invalid transaction ID.` });
        return;
    }

    const args = req.body.args ? req.body.args : [];
    if (args.length == 0) {
        res.status(400).json({ error: `contract ags not supplied` });
        return;
    }

    const contractor = req.body.contractor ? String(req.body.contractor) : '';
    if (!contractor) {
        res.status(400).json({ error: `contractor not defined.` });
        return;
    }

    const now = new Date().getTime();

    const c: models.Contract = {
        id: crypto.randomUUID(),
        state: 'executed',
        type: contractType,
        transactions: [tx.id],
        updates: [{
            args: args,
            contractor: contractor,
            time: now,
        }],
        originator: tx.from,
        registeredTime: now,
        updatedTime: now,
        by: env.SERVER_ID
    };
    
    if (!contracts.registerContract(c)) {
        res.status(500).json({ error: `failed to register contract, post aborted.` });
        return;
    } else {
        res.status(200).json(contracts.getOne(c.id));
    };
});

router.patch('/contracts', (req, res) => {
    const id = req.query.id ? String(req.query.id) : undefined;
    if (!id) {
        res.status(400).json({ error: `id not defined.` });
        return;
    }

    const args = req.body.args ? req.body.args : [];
    if (args.length == 0) {
        res.status(400).json({ error: `contract ags not supplied` });
        return;
    }

    const contractor = req.body.contractor ? String(req.body.contractor) : '';
    if (!contractor) {
        res.status(400).json({ error: `contractor not defined.` });
        return;
    }

    if (!contracts.patch(id, args, contractor)) {
        res.status(500).json({ error: `failed to patch contract, patch aborted.` });
        return;
    } else {
        res.status(200).json(contracts.getOne(id));
    };
});

export default router;