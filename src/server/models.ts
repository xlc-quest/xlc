export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount?: number;
    message?: string;
    contracts?: Contract[];
    time: number;
    by: string;
}

export interface Connection {
    id: string;
    registeredTime?: number;
    url?: string;
    expiry?: number;
    influence?: number;
    to: string;
}

const CONTRACT_PENDING = 'pending';
const CONTRACT_TERMINATED = 'terminated';
const CONTRACT_EXECUTRED = 'executed';

const CONTRACT_RESPONSES = 'responses';
const CONTRACT_COMMENTS = 'comments';

export interface ContractUpdates {
    contractor: string,
    args: [],
    time: number
}

export interface Contract {
    id: string;
    state: string;
    type: string;
    transactions: string[]; // tx1 - initiation, tx2 - completion, tx3? - validation, tx4? - completion
    args?: string[];
    contractors?: string[];
    updates: ContractUpdates[];
    originator: string;
    registeredTime: number;
    updatedTime: number;
    by: string;
}