import * as dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import mongoose from "mongoose"

import CountdownPublisher from './src/notification-service/CountdownPublisher.js'
import { ViewModel as DataSource } from './src/fish-data-engine/viewmodel.js'
import SubscriberManager from './src/notification-service/SubscriberManager.js'
import FishEntryProcessor from './src/notification-service/FishEntryProcessor.js'

const app = express()

const startServer = async () => {
  const isProd = process.env.NODE_ENV === 'production'

  try {
    mongoose.connect(isProd ? process.env.DB_URL : process.env.TEST_DB_URL);
    mongoose.set('strictQuery', false);
  } catch (error) {
    console.error(isProd ? "Production " : "Development " + "DB connection failed.")
    console.error(error)
    console.error("Aborting app launch.")
    process.exit(1)
  }

  console.log(isProd ? "Production " : "Development " + "DB connection extablished.")

  const fishTimerPublisher = new CountdownPublisher()
  const fishEntryProcessor = new FishEntryProcessor(fishTimerPublisher)
  const subscriberManager = new SubscriberManager(fishTimerPublisher)
  const fishDataSource = new DataSource(fishEntryProcessor)
  fishDataSource.initialize()
  subscriberManager.initializeUsersFromDatabase();

  app.listen(3000, function () {
    console.log('Listing on port 3000!')
  })

}

startServer()



