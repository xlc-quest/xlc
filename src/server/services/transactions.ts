import { Transaction } from "../models";
import * as env from "../env";
import * as fs from 'fs';
import * as lockfile from 'proper-lockfile';
import * as crypto from 'crypto';
//import * as JSONStream from 'JSONStream';

const _transactions: Transaction[] = [];
const _transactionIdMap: { [key: string]: Transaction } = {};
let DATA_ROOT: string;

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

export function restoreFromFiles(registeredTime: number): number {
    let lastTxFileTime = registeredTime;
    DATA_ROOT = `./data/${env.SERVER_ID}/transactions/${registeredTime}`;
    if (!fs.existsSync(DATA_ROOT)){
      fs.mkdirSync(DATA_ROOT, { recursive: true });
    }
    
    if (_transactions.length == 0) {
      const txFiles = fs.readdirSync(DATA_ROOT);
      lastTxFileTime = txFiles.reduce((lastTxTime, t) =>  {
         const txTime = Number(t.split('-')[1]);
         return lastTxTime > txTime ? lastTxTime : txTime;
      }, 0);

      console.log(`restoring txs from ${txFiles.length} files..`);
      for (let i=0; i<txFiles.length; i++) {
        const txFileBuffer = fs.readFileSync(`${DATA_ROOT}/${txFiles[i]}`);
        const txJson = JSON.parse(txFileBuffer.toString());

        _transactions.push(...txJson);
        for (let i=0; i<txJson.length; i++) {
          _transactionIdMap[_transactions[i].id] = _transactions[i];
        }
        
        console.log(`restored ${_transactions.length} txs from ${txFiles[i]}..`);
      }
    }

    if (_transactions.length != Object.keys(_transactionIdMap).length) {
      throw `transaction list (${_transactions.length}) and map (${Object.keys(_transactionIdMap).length}) mismatch!! cannot proceed!!`;
    }

    return _transactions.length > 0 ? lastTxFileTime : 0;
}

export function _onReceivedPeerTransactions(newPeerTxs: Transaction[]) {
  let count = 0;

  const uniqueTxs = _mergeAndSortTransactions(newPeerTxs);
  for (let i=0; i<uniqueTxs.length; i++) {
    count += addTransaction(uniqueTxs[i]) ? 1 : 0;
  }

  return count;
}

export function addTransaction(tx: Transaction): boolean {
  if (_transactions.length != Object.keys(_transactionIdMap).length) {
      throw `transaction list (${_transactions.length}) and map (${Object.keys(_transactionIdMap).length}) mismatch!! cannot proceed!!`;
  }

  let listTx = _transactions.find((t) => t.id == tx.id);
  let mapTx = _transactionIdMap[tx.id];
  if (listTx || mapTx) {
      // throw error if mismatch
      console.warn(`transaction id ${tx.id} already exists.. skipping..`);
      return false;
  } else {
      _transactions.push(tx);
      _transactionIdMap[tx.id] = tx;
      _transactions.sort((ta, tb) => (ta.time < tb.time ? -1 : 1));
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

export function getOne(id: string) {
  return _transactionIdMap[id];
}

export function getLastTxFileTime(): number {
  if (!fs.existsSync(DATA_ROOT)) throw `DATA_ROOT not set, check onStart..`;

  let firstTxTime = _transactions.length > 0 ? _transactions[0].time : 0;

  const txFiles = fs.readdirSync(DATA_ROOT);
  return txFiles.reduce((lastTxTime, t) =>  {
     const txTime = Number(t.split('-')[1]);
     return lastTxTime > txTime ? lastTxTime : txTime;
  }, firstTxTime);
}

export function onPostSync(): number {
  if (!_transactions.length) {
    console.log(`no transactions to proceed.. skip post sync..`);
    return 0;
  }

  if (!fs.existsSync(DATA_ROOT)) throw `DATA_ROOT not set, check onStart..`;

  const lastTxTime = _transactions[_transactions.length-1].time;
  const lastTxFileTime = getLastTxFileTime();
  const dataStoreCadence = 4 * 3600000;

  if (lastTxTime - lastTxFileTime > dataStoreCadence) {
    const txBlock = _transactions.filter(t => t.time >= lastTxFileTime);
    const count = txBlock.length;
    const dataPath = `${DATA_ROOT}/${lastTxFileTime}-${lastTxTime}-${count}.json`;
    
    console.log(`storing data every ${dataStoreCadence/60000} mins.. ${dataPath}`);

    lockfile.lock(DATA_ROOT).then((release) => {
      fs.writeFileSync(dataPath, JSON.stringify(txBlock), "utf8");
      return release();
    }).catch((e) => {
      console.error(e);
      return;
    }).finally(() => {
      console.log(`stored ${count} txs to ${dataPath}..`);
    });
  }

  return lastTxTime;
}
export function getRange(from: number, to: number) {
  return _transactions.filter(t => from <= t.time && t.time <= to);
}

export function getFiltered(filterFunc: (t: Transaction) => boolean) {
  return _transactions.filter(filterFunc);
}

