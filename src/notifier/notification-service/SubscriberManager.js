import User from "./User.js";
import database from "../db/db.js";
import until from "../common/util/Until.js"
import {logger} from "../common/logger.js";
import { InternalError } from "./Errors.js";

export default class SubscriberManager {
  constructor(countdownPublisher) {
    this.initialized = false
    this.intuitionFishReqs = null
    this.activeSubscribers = {};
    this.countdownPublisher = countdownPublisher;
  }

  async initialize() {
    await until(() => this.countdownPublisher.initialized)
    try {
      await this.loadExistingUsers()
    } catch (err) {
      throw err
    }

    this.initialized = true;
  }

  // User db object should contain at least one subbed fish before this is called.
  async loadUserRecord(userId) {
    if (!this.countdownPublisher.initialized) {
      logger.warn("Can't activate user if the countdownPublisher is not started.")
      return
    }
    try {
      let subscriptions = await database.getAllUserSubscriptions(userId)
      let notifcationStrategies = await database.getUserNotifcationStrategies(userId)
      if (this.activeSubscribers[userId]) {
        this.activeSubscribers[userId].destroy()
        delete this.activeSubscribers[userId]
      }
      this.activeSubscribers[userId] = new User(
        userId, this.countdownPublisher, subscriptions, notifcationStrategies.map(i => { return i.strategy })
      )
    } catch (err) {
      logger.error(err)
      throw new InternalError()
    }
  }

  // Right now, if we fail to load any of the existing user, something is wrong and
  // we should abort the startup.
  async loadExistingUsers() {
    let users = await database.getAllUserIds()
    for (const row of users) {
      try {
        await this.loadUserRecord(row.user_id)
      } catch (err) {
        logger.error(err)
        throw err
      }
      
    }
  }
}
