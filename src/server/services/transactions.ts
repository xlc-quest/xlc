import { Transaction } from "../models";
import * as env from "../env";
import * as fs from 'fs';
import * as lockfile from 'proper-lockfile';
import * as crypto from 'crypto';

const _transactions: Transaction[] = [];
const _transactionIdMap: { [key: string]: Transaction } = {};

function _isStrike(probability: number) {
    return !!probability && Math.random() <= probability;
}

function _mergeAndSortTransactions(txs: Transaction[]): Transaction[] {
  const txIdMap: { [key: string]: Transaction } = {};
  for (let i=0; i<txs.length; i++) {
    let tx = txs[i];
    if (!txIdMap[tx.id]) {
      txIdMap[tx.id] = tx;
    }
  }

  const uniqueTxs = Object.values(txIdMap).sort((ta, tb) => (ta.time < tb.time ? -1 : 1));
  return uniqueTxs;
}

export function onStart(registeredTime: number): number {
    let lastTxSyncTime = registeredTime;
    const dataRoot = `./data/${env.SERVER_ID}/transactions/${registeredTime}`;
    if (!fs.existsSync(dataRoot)){
      fs.mkdirSync(dataRoot, { recursive: true });
    } 
    
    if (_transactions.length == 0) {
      const txFiles = fs.readdirSync(dataRoot);
      lastTxSyncTime = txFiles.reduce((lastTxTime, t) =>  {
         const txTime = Number(t.split('-')[1]);
         return lastTxTime > txTime ? lastTxTime : txTime;
      }, 0);

      for (let i=0; i<txFiles.length; i++) {
        lockfile.lock(dataRoot).then((release) => {
          const txFile = fs.readFileSync(`${dataRoot}/${txFiles[i]}`);
          const txJson = JSON.parse(txFile.toString());
          _transactions.push(...txJson);

          return release();
        }).catch((e) => {
          console.error(e);
          return;
        });
      }

      console.log(`restored ${_transactions.length} txs from ${txFiles.length} files..`);
    }

    return lastTxSyncTime;
}

export function tryPostReward(to: string, probability: number) {
    const now = new Date().getTime();

    const recentRewardTx = _transactions.find((t) => t.from == env.SERVER_ID && t.to == to && t.time > now - 10000);
    if (!recentRewardTx) {
      const reward = Math.floor(Math.random() * 10)/10000;
      // console.log(`${c.id}\
      //   \nweight: ${weight}, serverAge: ${serverAge}s, connectionAge: ${connectionAge}s, \
      //   \nconnectionWeight: ${connectionAge / serverAge}, influence: ${c.influence.toFixed(1)}`);
      // console.log(`${c.id} influence ${(c.influence*100).toFixed(1)}%`);
      const prob = .1 + probability;

      if (_isStrike(prob)) {
        console.log(`!!*#*#*STRIKE*#*#*!! for ${to}..`);
        addTransaction({
          id: crypto.randomUUID(),
          time: new Date().getTime(),
          from: env.SERVER_ID,
          to: to,
          amount: reward > 0 ? reward : .0001,
          message: `connection reward strike at ${(prob*100).toFixed(1)}%`,
        });
      }
    }
}

export function _onReceivedPeerTransactions(allPeerTransactions: Transaction[]) {
  let count = 0;

  const uniqueTxs = _mergeAndSortTransactions(allPeerTransactions);
  for (let i=0; i<uniqueTxs.length; i++) {
    count += addTransaction(uniqueTxs[i]) ? 1 : 0;
  }

  return count;
}

export function addTransaction(tx: Transaction): boolean {
  if (_transactions.length != Object.keys(_transactionIdMap).length) {
      throw `transaction list and map mismatch.. cannot proceed..`;
  }

  let listTx = _transactions.find((t) => t.id == tx.id);
  let mapTx = _transactionIdMap[tx.id];
  if (listTx || mapTx) {
      // throw error if mismatch
      console.warn(`transaction id ${tx.id} already exists.. skipping..`);
      console.warn(listTx);
      console.warn(mapTx);
      return false;
  } else {
      _transactions.push(tx);
      _transactionIdMap[tx.id] = tx;
      return true;
  }
}

export function getLength(): number {
  return _transactions.length;
}

export function getBalance(clientId: string): number {
  let toAmount = 0;
  let fromAmount = 0;

  return _transactions.reduce((sum, t) => {
    sum += t.to == clientId ? Number(t.amount) : 0;
    sum += t.from == clientId ? -1*Number(t.amount) : 0;
    
    toAmount += t.to == clientId ? Number(t.amount) : 0;
    fromAmount += t.from == clientId ? Number(t.amount) : 0;
    return sum;
}, 0);
}

export function getSummary(clientId: string) {
  return {
    from: _transactions.filter(t => t.from == clientId).length,
    to: _transactions.filter(t => t.to == clientId).length,
    mine: _transactions.filter(t => t.from == clientId || t.to == clientId).length,
    all: _transactions.length
  }
}

export function getAll(): Transaction[] {
  return _transactions;
}