import express from 'express'
import mongoose from "mongoose"

import { ViewModel as DataSource } from './src/fish-data-engine/viewmodel.js'
const app = express()

try  {
  await mongoose.connect('mongodb://127.0.0.1:27017/ffxiv-bigfish-notifier')
  console.log("DB connection successful")
} catch (err) {
  console.error("DB Connection Error:")
  console.error(err)
  console.error("Aborting App start.")
  process.exit(1)
}

let fishDataSource = new DataSource()
fishDataSource.initialize()

app.listen(3000, function() {
  console.log('Listing on port 3000!')
})

