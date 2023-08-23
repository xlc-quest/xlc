import { Connection } from "../models";
import * as transactions from "./transactions";
import * as env from "../env";

function _isStrike(probability: number) {
    return !!probability && Math.random() <= probability;
}

export function tryPost(c: Connection) {
    const now = new Date().getTime();

    const recentRewardTx = transactions.filter((t) => t.from == env.SERVER_ID && t.to == c.id && t.time > now - 30000);
    if (!recentRewardTx && c.influence) {
      const reward = Math.floor(Math.random() * 10)/10000;
      // console.log(`${c.id}\
      //   \nweight: ${weight}, serverAge: ${serverAge}s, connectionAge: ${connectionAge}s, \
      //   \nconnectionWeight: ${connectionAge / serverAge}, influence: ${c.influence.toFixed(1)}`);
      // console.log(`${c.id} influence ${(c.influence*100).toFixed(1)}%`);

      const adjustment = 0;//.1;
      const prob = c.influence + adjustment;

      if (_isStrike(prob)) {
        console.log(`!!*#*#*STRIKE*#*#*!! for ${c.id}..`);
        transactions.addTransaction({
          id: crypto.randomUUID(),
          time: now,
          from: env.SERVER_ID,
          to: c.id,
          amount: reward > 0 ? reward : .0001,
          message: `connection reward at ${(prob*100).toFixed(1)}% influence`,
          by: env.SERVER_ID
        });
      }
    }
}