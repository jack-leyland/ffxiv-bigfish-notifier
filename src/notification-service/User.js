import { NOTIFICATION_STRATEGIES } from "./NotificationStrategies/index.js";
import database from "../db/db.js";
/**
 *  User objects subscribe to the Fish Timers, and dispatch notifications
 *  accordingly. They are initialized from a user db record. Users added by the
 *  client at runtime should save them to the db first. 
 *
 *  The main contraint with this current design is that users rely on a
 *  reference to a CountdownPublisher already running and accepting
 *  subscriptions.
 *
 *  This is resolved at the moment by having the SubscriberManager class be
 *  responsible for the management of User objects such that they'll only be
 *  created once the required conditions are met. That also gives us a way to
 *  manage users at runtime.
 *
 * */

class NotificationRequest {
    constructor(userId, timeUntil, fishId, fishName) {
        this.userId = userId;
        this.timeUntil = timeUntil;
        this.fishId = fishId;
        this.fishName = fishName;
    }
}

export default class User {
    /**
     * TODO: We need to make sure that we are subscribed to the intuitionfish we
     * need as well!
     */
    constructor(dbObject, countdownPublisher) {
        this.timerSource = countdownPublisher;
        this.userId = dbObject.userId;
        this.notificationStrategies = dbObject.notification_strategies
        this.fishNotificationConditions = {}

        for (const fish of dbObject.subscribed_fish) {
            this.fishNotificationConditions[fish.fishId] = fish.minutes_before
        }
        for (const fish in this.fishNotificationConditions) {
            this.timerSource.fishSubjects[fish].subscribe(this.checkFishConditions.bind(this))
        }
    }

    /**
     * TODO: Here is where we'll have to put the special checks for intuition
     * requirements and special fish like the warden.
     */
    checkFishConditions(fishTimerUpdate) {
        let condition = this.fishNotificationConditions[fishTimerUpdate.fishId]
        for (const timer of fishTimerUpdate.timers) {
            if (condition === timer.minutes) {
                this.dispatchNotifications(fishTimerUpdate.fishId, condition)
            }
        }
        
    }

    /**
     * Eventually, we'll probably want to get rid of this global strategies
     * object in favor of something a little better. 
     */
    async dispatchNotifications(fishId, timeCondition) {
        const fishData = await database.getFishById(fishId, "name_en")
        for (const strat of this.notificationStrategies) {
            let request = new NotificationRequest(this.userId, timeCondition, fishId, fishData.name_en)
            NOTIFICATION_STRATEGIES[strat].sendNotification(request)
        }
    }
}