import UserModel from "../db/models/Users.js";
import User from "./User.js";

/**
 *
 * Utility function which allows us to await a predicate condition before
 * proceeding with function execution.
 *
 */
function until(conditionFunction) {

    const poll = resolve => {
      if (conditionFunction()) resolve();
      else setTimeout(_ => poll(resolve), 400);
    }
  
    return new Promise(poll);
  }


export default class SubscriberManager {
    constructor(countdownPublisher) {
        this.activeSubscribers = {};
        this.countdownPublisher = countdownPublisher;
    }

    async initializeUsersFromDatabase() {
        await until(() => this.countdownPublisher.initialized)
  
        for await (const user of UserModel.find().cursor()) {
            this.activeSubscribers[user.userId] = new User(user, this.countdownPublisher);
        } 
    }

    removeSubscriber(userId) {
        delete this.activeSubscribers[userId]
    }
}