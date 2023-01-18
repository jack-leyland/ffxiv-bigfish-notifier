import { NOTIFICATION_STRATEGIES } from "./NotificationStrategies/index.js";
import {logger} from "../common/logger.js";
import { Subscription } from "rxjs";
/**
 *  User objects subscribe to the Fish Timers, and dispatch notifications
 *  accordingly. Fish subscriptions and intuition fish subsciptions are stored
 *  in separate tables, this was done to enable the expected client-facing
 *  functionality of automatically unsubcribing intuition notifcations when the
 *  parent fishId is unsubscribed from.
 *
 *  From the perspective of this class though, all subscriptions are equal. 
 *  This will notify for every fish_id and minutes_condition contained 
 *  for the user in both subscription tables. The notifcation strategy
 *  used to send the notification will inform the user if a given notifcation
 *  is an intuition dependency for another fish they subscribed to.
 *
 * */

class NotificationRequest {
  constructor(userId, timeUntil, fishId) {
    this.userId = userId;
    this.timeUntil = timeUntil;
    this.fishId = fishId;
  }
}

export default class User {

  constructor(userId, countdownPublisher, userSubcriptionRecords, notificationStrategies) {
    this.userId = userId
    this.timerSource = countdownPublisher
    this.notificationStrategies = notificationStrategies
    this.subscriptions = {}
    this.fishNotificationConditions = {}

    for (const row of userSubcriptionRecords) {
      if (!this.fishNotificationConditions[row.fish_id]) {
        this.fishNotificationConditions[row.fish_id] = new Set([row.minutes_condition])
        try {        
          this.subscriptions[row.fish_id] = 
            this.timerSource.fishSubjects[row.fish_id].subscribe(timerUpdate => this.checkFishConditions(timerUpdate))
        } catch (err) {
          logger.warn(`User [${userId}] | Attempted to subscribe to untracked fishId: ${row.fish_id}`)
        }

      } else {
        this.fishNotificationConditions[row.fish_id].add(row.minutes_condition)
      }
    }
    logger.info(`Initialized User: ${userId}`)
  }

  async checkFishConditions(fishTimersUpdate) {
    for (const timer of fishTimersUpdate.timers) {
      if (this.fishNotificationConditions[fishTimersUpdate.fishId].has(timer.minutes)) {
        await this.dispatchNotifications(fishTimersUpdate.fishId, timer.minutes)
      }
    }
  }

  // How to handle notifcation errors?
  async dispatchNotifications(fishId, timeCondition) {
    for (const strat of this.notificationStrategies) {
      let request = new NotificationRequest(this.userId, timeCondition, fishId)
      await NOTIFICATION_STRATEGIES[strat].sendNotification(request)
    }
  }

  // Must explicitly unsubscribe before this object is destroyed or we'll 
  // leak memory in the CountdownPublisher.
  destroy() {
    for (const id in this.subscriptions) {
      this.subscriptions[id].unsubscribe()
    }
  }
}
