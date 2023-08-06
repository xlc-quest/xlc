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

export function start(setClient?: Function) {
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
        client.id = client.id == ID_LOADING_PLACEHOLDER ? '@xlcdev' : client.id;

        if (setClient) {
            setClient({...client});
        }
    });

    // setInterval(() => {
    //     axios.get(`${configs.url}/connections?id=client:${client.ip}`).then((res) => {
    //         if (res.data.length <= 0) return;

    //         client.connections = res.data;
    //         if (setClient) {
    //             setClient({...client});
    //         }
    //     });
    // }, 3000);

/***
    ########################### TEST CODE ###############################
***/
    // setInterval(() => {
    //     axios.post(`${configs.url}/transactions?id=test:${client.ip}`, {
    //         from: `from#${(Math.random() * 1000).toFixed(0)}`,
    //         to: `to#${(Math.random() * 1000).toFixed(0)}`,
    //         amount: (Math.random() * 1).toFixed(4),
    //         message: "Test Transaction"
    //     }).then((res) => {
    //     });
    // }, Math.random() * 60000);
}