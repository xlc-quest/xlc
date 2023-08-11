import axios from "axios";
import { configs } from '../configs';

const ID_LOADING_PLACEHOLDER = '@xlcdev'
const CONNECTIONS_SERVER_ID = 'connections'

export const client = {
    id: ID_LOADING_PLACEHOLDER,
    ip: '..',
    influence: 0,
    serverUrl: 'loading',
    connections: [{
        id: CONNECTIONS_SERVER_ID,
        url: 'loading',
    }]
};

export const summary = {
    balance: 0,
    fromAmount: 0,
    toAmount: 0,
    transactionsFrom: 0,
    transactionsTo: 0,
    myTransactions: 0,
    allTransactions: 0
}

let interval: NodeJS.Timeout;

let _setClient: Function;
function setClient(client: any) {
    if (_setClient) _setClient(client);
    else console.error(`_setClient not defined`);
}

export function stop() {
    if (interval) {
        console.log(`stopping connections with client id.. ${client.id}..`);
        clearInterval(interval);
    }
}

export function start(setClientFunc?: Function) {
    if (client.id != ID_LOADING_PLACEHOLDER) {
        console.error(`connections.start should be executed only once`);
        return;
    }

    if (setClientFunc) {
        _setClient = setClientFunc;
    }

    const ipPromise = axios.get(`https://api.ipify.org?format=json'`).then((res) => {
        return res.data;
    });

    const connectionsPromise = axios.get(`${configs.serverUrl}/connections?id=${client.id}`, {timeout: 1000}).then((res) => {
        if (res.data.length <= 0) return;
        client.serverUrl = configs.serverUrl;
        setClient({...client});
        return res.data;
    }).catch(e => {
        console.warn(`GET /connections ..error after 1s, trying localhost..`);
        //configs.SERVER_URL = `http://localhost:${window.location.port}`;
    });

    Promise.all([ipPromise, connectionsPromise]).then((values) => {
        const [ip, c] = values;
        client.ip = ip;
        client.connections = c;
        setClient({...client});
    });

    interval = setInterval(() => {
        axios.get(`${configs.serverUrl}/connections?id=${client.id}`, {}).then((res) => {
            if (res.data.length <= 0) return;
            client.connections = res.data;
            const c = res.data.find((c: {id: string }) => c.id == client.id);
            client.influence = c.influence;
            setClient({...client});
        });
    }, 4000);

/***
    ########################### TEST CODE ###############################
***/
    // const testInterval = Math.random() * 10000 + 5000;
    // setInterval(() => {
    //     axios.post(`${configs.url}/transactions?id=test:${client.ip}`, {
    //         from: `@test#${(Math.random() * 1000).toFixed(0)}`,
    //         to: `@test#${(Math.random() * 1000).toFixed(0)}`,
    //         amount: (Math.random() * 1).toFixed(4),
    //         message: `Test Tx (every ${(testInterval/1000).toFixed(1)}s)`
    //     }).then((res) => {
    //     });
    // }, testInterval);
}