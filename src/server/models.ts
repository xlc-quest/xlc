export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount?: number;
    message?: string;
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