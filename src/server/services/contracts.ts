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

export function getByTxId(id: string, flatten: boolean): Contract[] {
    const contracts = _txIdContractsMap[id];
    const args: string[] = [];
    const contractors: string[] = [];
    if (flatten && contracts) {
        for (let i=0; i<contracts.length; i++) {
            const c = contracts[i];
            if (c.updates) {
                for (let j=0; j<c.updates.length; j++) {
                    args.push(...c.updates[j].args);
                    contractors.push(c.updates[j].contractor);
                }
            }

            c.args = args;
            c.contractors = contractors;
        }
    }

    return contracts;
}

export function patch(id: string, args: any, contractor: string) {
    const c = getOne(id);
    if (!c) {
        console.error(`given contract id ${id} not found..`);
        return false;
    }

    const now = new Date().getTime();
    c.updatedTime = now;
    c.updates.push({
        args: args,
        contractor: contractor,
        time: now
    })

    return true;
}

export function getLength(): number {
  return _contracts.length;
}

export function onReceivedPeerContracts(updatedContracts: Contract[]): number {
    let count = 0;

    updatedContracts.sort((ua, ub) => (ua.updatedTime < ub.updatedTime ? -1 : 1));
    for (let i=0; i<updatedContracts.length; i++) {
        const c = getOne(updatedContracts[i].id);
        if (!c) {
            registerContract(updatedContracts[i]);
        } else {
            if (c.updatedTime < updatedContracts[i].updatedTime) {
                for (let j=0; j<updatedContracts[i].updates.length; j++) {
                    if (!c.updates.find((u) => u.contractor == updatedContracts[i].updates[j].contractor && u.time == updatedContracts[i].updates[j].time)) {
                        c.updates.push(updatedContracts[i].updates[j]);
                    }

                    count++;
                }
            }
        }
    }

    // const uniqueTxs = _mergeAndSortContracts(updates);
    // for (let i=0; i<uniqueTxs.length; i++) {
    //   count += addTransaction(uniqueTxs[i]) ? 1 : 0;
    // }
  
    return count;
}

