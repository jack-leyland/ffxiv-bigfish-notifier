import express from 'express'
import cors from "cors"

import { ViewModel as DataSource } from './fish-data-engine/viewmodel.js'
import CountdownPublisher from './notification-service/CountdownPublisher.js'
import NotificationService from './notification-service/NotificationService.js'
import FishEntryProcessor from './notification-service/FishEntryProcessor.js'
import SubscriberManager from './notification-service/SubscriberManager.js'
import until from './common/util/Until.js'
import {logger} from './common/logger.js'
import { usersRouter } from './routes/Users.js'
import { subscriptionsRouter } from './routes/Subscriptions.js'
import { CONFIG } from './common/config.js'

// Because of the one minute tick on the fish timers, the subscriber manager has
// to wait for the initial tick in order for the fish timer rxjs subjects to
// exist before it can initialize users and their subscriptions. In that first
// minute, the data source stream starts and queues the initial fish windows to
// be processed by that first tick. All this to say that right now, it
// necessarily takes one minute for the app to start and be ready to accept API
// requests from the discord client. It does not listen on the port until
// everything is ready, so the discord client will simply get a connection
// refused error if the notifier is in the middle of a restart.

const startServer = async () => {
  const app = express()
  // This is a bit crude, but for now both the client and this API are going 
  // be deployed on the same host, so only requests from localhost are accepted.
  app.use(cors({origin:'http://localhost'}))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  try {

    const publisher = new CountdownPublisher()
    const fishEntryProcessor = new FishEntryProcessor(publisher)
    const source = new DataSource(fishEntryProcessor)
    const subscriberManager = new SubscriberManager(publisher)
    const notificationService = new NotificationService(subscriberManager)
    source.initialize()
    notificationService.start()
    await until(() => notificationService.ready)
    app.use('/users', usersRouter(notificationService))
    app.use('/subscriptions', subscriptionsRouter(notificationService))

  } catch (err) {
    // Winston will not flush the error log to a file if we call process.exit(1)  
    // here for some reason, so just rethrowing will trigger winston's 
    // uncaughtException handler, which does properly flush everything to the 
    // log files before exiting. This works as a hack until I can find some better solution.
    logger.error(err)
    logger.error("Aborting Startup.")
    throw err
  }
  app.listen(CONFIG.PORT, function () {
    console.log(`Listing on port ${CONFIG.PORT}!`)
  })

}


startServer()




