import { logger } from "../common/logger.js";
import database from "../db/db.js"
import until from "../common/util/Until.js"
import { MAXIMUM_NOTIFICATION_TIME } from "../common/constants.js"
import { 
  FishNameNotFoundError, 
  InternalError, 
  SubscriptionAlreadyExistsError, 
  UnsupportedNotificationPeriodError 
} from "./Errors.js";

// This class is the top-level entry into the notifcation service, it defines
// the set of actions the client can take when interacting with the notifcation
// system. The primary source of truth for user and subcsciptions is the
// database. As such, this class must first make the required changes to the db,
// and then notify the subscriber manager that a change has taken place, so it
// can initialize/reinitialize that record, such that the behavior for that user
// is consistent with the change.
//
// This simplifies the API for the subscriberManager, as opposed to making
// changes to and already running user and making the sure the database reflects
// its state separately.
export default class NotificationService {
  constructor(subManager) {
    this.ready = false
    this.subscriberManager = subManager;
  }

  // The subcriberManager takes a while to start up, so this is necessary.
  async start() {
    this.subscriberManager.initialize()
    await until(() => this.subscriberManager.initialized === true)
    this.ready = true
  }

  /**
   * Register a user for given notification strategy by providing the unique ID
   * for the user provided by the client for that strategy. Right now, this will
   * only be discord. Throws if the user is already registered for that
   * strategy.
   */
  async registerUser(notificationStrategy, strategyId) {
    switch (notificationStrategy.toLowerCase()) {
      case "discord":
        try {
          await database.createNewDiscordUserRecord(strategyId);
        } catch (err) {
          if (err.type && err.type === "UserAlreadyExistsError") {
            throw err
          } else {
            logger.error(err)
            //handle logging for non-fatal internal errors here
            throw new InternalError()
          }
        }
        return
      default:
        //logging 
        throw InternalError()
    }
  }


  async subscribeToFish(userId, fishName, minutes, intuitionFlag) {
    // Check to see if we're ready to accept subs yet
    try {
      if (!this.ready) {
        logger.warn("Not yet ready to accept subscriptions")
        return
      }

      if (minutes > MAXIMUM_NOTIFICATION_TIME || minutes < 0) {
        throw new UnsupportedNotificationPeriodError()
      }

      // Get request fish data from db
      let fishData = await database.getSubscribableFishByName(fishName)
      if (!fishData) {
        throw new FishNameNotFoundError()
      }


      let newSubscriptionId = await database.addSubscriptionIfNew(userId, fishData.fish_id, minutes)
      if (!newSubscriptionId) {
        let isSubscribedToIntuitionFish = await database.subscriptionIncludesIntuitionFish(userId, fishData.fish_id, minutes)
        if (isSubscribedToIntuitionFish || (!isSubscribedToIntuitionFish && !intuitionFlag)) {
          throw new SubscriptionAlreadyExistsError()
        }
      }

      let intuitionRequirements = await database.getTimedIntuitionRequirementsForFish(fishData.fish_id)
      // If the flag is set but there aren't any intuition fish anyways then return 
      if (!intuitionFlag || !intuitionRequirements) {
        await this.subscriberManager.loadUserRecord(userId)
        return
      }
      //If we're add intuition fish to an existing sub, then, we need to fetch the Id
      if (!newSubscriptionId) {
        let exitstingRecord = await database.getSubscriptionId(userId, fishData.fish_id, minutes)
        for (const row of intuitionRequirements) {
          await database.addIntuitionSubscription(exitstingRecord.subscription_id, userId, row.intuition_fish_id, minutes)
        }
      } else {
        for (const row of intuitionRequirements) {
          await database.addIntuitionSubscription(newSubscriptionId, userId, row.intuition_fish_id, minutes)
        }
      }

      await this.subscriberManager.loadUserRecord(userId)
    } catch (err) {
      if (err.type && err.type === "InternalDatabaseError") {
        logger.error(err)
        throw new InternalError()
      } else if (err.type) {
        throw err
      } else {
        logger.error(err)
        throw new InternalError()
      }
    }

  }

  /**
   * The client must retreive a subscription Id before it can unsubscribe from a fish. 
   * This will return the revelant info on a user's subscription to a fishId, 
   * which the client can either display to the user as options for which condition
   * to remove, or just directly remove the only existing one. 
   */
  async getUserSubscriptionsForFish(userId, fishName) {
    try {
      let fishData = await database.getSubscribableFishByName(fishName)
      if (!fishData) {
        throw new FishNameNotFoundError()
      }

      let res = await database.getFishSubscriptionDetails(userId, fishData.fish_id)
      return res
    } catch (err) {
      if (err.type && err.type === "InternalDatabaseError") {
        logger.error(err)
        throw new InternalError()
      } else if (err.type) {
        throw err
      } else {
        logger.error(err)
        throw new InternalError()
      }
    }
  }

  async getAllUserSubscriptions(userId) {
    try {
      let res = await database.getAllUserSubscriptions(userId)
      return res
    } catch (err) {
      if (err.type && err.type === "InternalDatabaseError") {
        logger.error(err)
        throw new InternalError()
      } else if (err.type) {
        throw err
      } else {
        logger.error(err)
        throw new InternalError()
      }
    }
  }

  /**
   * Any associated intuition subscriptions will also be removed.
   * 
   */
  async deleteSubscription(subId) {
    try {
      await database.deleteSubscription(subId)
    } catch (err) {
      logger.error(err)
      throw new InternalError()
    }
  }

  async removeUser(strategy, strategyId) {
    switch (strategy.toLowerCase()) {
      case "discord":
        try {
          await database.deleteDiscordUserRecord(strategyId);
        } catch (err) {
          logger.error(err)
          //handle logging for non-fatal internal errors here
          throw new InternalError()
        }
        return
      default:
        //logging 
        throw InternalError()
    }
  }

}
