import { Contract } from "../models";

const _contracts: Contract[] = [];
const _contractIdMap: { [key: string]: Contract } = {};
const _txIdContractsMap: { [key: string]: Contract[] } = {};

export function registerContract(c: Contract): boolean {
    if (_contracts.length != Object.keys(_contractIdMap).length) {
        throw `contract list (${_contracts.length}) and map (${Object.keys(_contractIdMap).length}) mismatch!! cannot proceed!!`;
    }
  
    let listContract = _contracts.find((_c) => _c.id == c.id);
    let mapContract = _contractIdMap[c.id];
    if (listContract || mapContract) {
        // throw error if mismatch
        console.error(`contract id ${c.id} already exists.`);
        return false;
    } else {
        _contracts.push(c);
        _contractIdMap[c.id] = c;
        c.transactions.forEach(t => {
            if (!_txIdContractsMap[t]) {
                _txIdContractsMap[t] = [c];
            } else {
                _txIdContractsMap[t].push(c);
            }
        });
        return true;
    }
}

export function getAll(): Contract[] {
    return _contracts;
}
export function getOne(id: string): Contract {
    return _contractIdMap[id];
}

export function getByTxId(id: string): Contract[] {
    return _txIdContractsMap[id];
}

export function patch(id: string, args: any, contractor: string) {
    const c = getOne(id);
    if (!c) return false;

    c.args.push(...args);
    c.contractors.push(contractor);
    c.times.push(new Date().getTime());

    return true;
}

export function getLength(): number {
  return _contracts.length;
}

export function onReceivedPeerContracts(updates: Contract[]): number {
    let count = 0;

    updates.sort((ua, ub) => (ua.times[ua.times.length-1] < ub.times[ub.times.length-1] ? -1 : 1));
    for (let i=0; i<updates.length; i++) {
        const c = getOne(updates[i].id);
        if (!c) {
            registerContract(updates[i]);
        } else {
            const lastUpdatedTime = updates[i].times[updates[i].times.length-1];
            if (lastUpdatedTime > c.times[c.times.length-1]) {
                c.state = updates[i].state;
                c.args = updates[i].args;
                c.contractors = updates[i].contractors;
                c.times = updates[i].times;
                count++;
            }
        }
    }

    // const uniqueTxs = _mergeAndSortContracts(updates);
    // for (let i=0; i<uniqueTxs.length; i++) {
    //   count += addTransaction(uniqueTxs[i]) ? 1 : 0;
    // }
  
    return count;
}

