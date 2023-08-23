import { Connection } from "../models";
import * as transactions from "./transactions";
import * as env from "../env";

const REWARD_DEFAULT = .0001;
const SERVER_REWARD_CONSTANT = 2;
const CLIENT_REWARD_CONSTANT = 1;

const CONNECTION_REWARD_CONSTANT = 0;
const POST_TX_REWARD_CONSTANT = 1;
const POST_ID_REWARD_CONSTANT = 100; // ..to 0

export const TRIAL_CADENCE = 10000;

export enum RewardType {
    CONNECTION,
    POST_TX,
    POST_ID,
}

function _isStrike(probability: number) {
    return !!probability && Math.random() <= probability;
}

export function tryPost(c: Connection, rwdType: RewardType) {
    const now = new Date().getTime();

    const recentRewardTx = transactions.filter((t) => t.from == env.SERVER_ID && t.to == c.id && t.time > now - TRIAL_CADENCE);
    if (!recentRewardTx && c.influence) {
      let bonusConstant = c.id.startsWith(`@server`) ? SERVER_REWARD_CONSTANT : CLIENT_REWARD_CONSTANT;
      switch (rwdType) {
        case RewardType.POST_TX:
            bonusConstant += POST_TX_REWARD_CONSTANT;
            break;
        case RewardType.POST_ID:
            bonusConstant += POST_ID_REWARD_CONSTANT;
            break;
        case RewardType.CONNECTION:
        default:
            bonusConstant += CONNECTION_REWARD_CONSTANT;
            break;
      }

      const reward = (Math.floor(Math.random() * 10)/10000 + REWARD_DEFAULT) * (1 + (c.influence * bonusConstant)); // influence bonus
      // console.log(`${c.id}\
      //   \nweight: ${weight}, serverAge: ${serverAge}s, connectionAge: ${connectionAge}s, \
      //   \nconnectionWeight: ${connectionAge / serverAge}, influence: ${c.influence.toFixed(1)}`);
      // console.log(`${c.id} influence ${(c.influence*100).toFixed(1)}%`);

      const adjustment = 0;//.1;
      const prob = c.influence + adjustment;

      let messagePrefix: string;
      switch (rwdType) {
        case RewardType.POST_TX:
            messagePrefix = 'transaction activity';
            break;
        case RewardType.POST_ID:
            messagePrefix = 'new identity promotional';
            break;
        case RewardType.CONNECTION:
        default:
            messagePrefix = 'connection';
            break;
      }

      const message = `${messagePrefix} reward at ${(prob*100).toFixed(1)}% influence`;

      if (_isStrike(prob)) {
        console.log(`!!*#*#*STRIKE*#*#*!! for ${c.id}..`);
        transactions.addTransaction({
          id: crypto.randomUUID(),
          time: now,
          from: env.SERVER_ID,
          to: c.id,
          amount: reward,
          message: message,
          by: env.SERVER_ID
        });
      }
    }
}