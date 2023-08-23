import { Connection } from "../models";
import * as transactions from "./transactions";
import * as env from "../env";

const REWARD_DEFAULT = .0001;
const SERVER_REWARD_CONSTANT = 2;
const CLIENT_REWARD_CONSTANT = 1;

export const TRIAL_CADENCE = 20000;

function _isStrike(probability: number) {
    return !!probability && Math.random() <= probability;
}

export function tryPost(c: Connection) {
    const now = new Date().getTime();

    const recentRewardTx = transactions.filter((t) => t.from == env.SERVER_ID && t.to == c.id && t.time > now - TRIAL_CADENCE);
    if (!recentRewardTx && c.influence) {
      const bonusConstant = c.id.startsWith(`@server`) ? SERVER_REWARD_CONSTANT : CLIENT_REWARD_CONSTANT;
      const reward = (Math.floor(Math.random() * 10)/10000 + REWARD_DEFAULT) * (bonusConstant + c.influence); // influence bonus
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
          amount: reward,
          message: `connection reward at ${(prob*100).toFixed(1)}% influence`,
          by: env.SERVER_ID
        });
      }
    }
}