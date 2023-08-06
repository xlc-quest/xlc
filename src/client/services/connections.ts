import axios from "axios";
import { configs } from "../../configs";

const ID_LOADING_PLACEHOLDER = '@loading..'
const CONNECTIONS_SERVER_ID = 'connections'

export const client = {
    id: ID_LOADING_PLACEHOLDER,
    ip: '..',
    balance: 0,
    connections: [{
        id: CONNECTIONS_SERVER_ID,
        url: 'about:blank',
    }]
};

let _setClient: Function;
export function setClient(client: any) {
    if (_setClient) _setClient(client);
    else console.error(`_setClient not defined`);
}

export function start(setClientFunc?: Function) {
    if (client.id != ID_LOADING_PLACEHOLDER) {
        console.error(`connections.start should be executed only once`);
        return;
    }
    client.id = '@xlcdev';

    if (setClientFunc) {
        _setClient = setClientFunc;
    }

    const ipPromise = axios.get(`https://api.ipify.org?format=json'`).then((res) => {
        return res.data;
    });

    const connectionsPromise = axios.get(`${configs.url}/connections?id=client:${client.ip}`).then((res) => {
        if (res.data.length <= 0) return;
        return res.data;
    });

    Promise.all([ipPromise, connectionsPromise]).then((values) => {
        const [ip, c] = values;
        client.ip = ip;
        client.connections = c;

        setClient({...client});
    });

    setInterval(() => {
        axios.get(`${configs.url}/connections?id=client:${client.ip}`).then((res) => {
            if (res.data.length <= 0) return;

            client.connections = res.data;
            setClient({...client});
        });
    }, 3000);

/***
    ########################### TEST CODE ###############################
***/
    const testInterval = Math.random() * 10000 + 5000;
    setInterval(() => {
        axios.post(`${configs.url}/transactions?id=test:${client.ip}`, {
            from: `from#${(Math.random() * 1000).toFixed(0)}`,
            to: `to#${(Math.random() * 1000).toFixed(0)}`,
            amount: (Math.random() * 1).toFixed(4),
            message: `Test Tx (every ${(testInterval/1000).toFixed(1)}s)`
        }).then((res) => {
        });
    }, testInterval);
}