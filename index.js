import express from 'express'
import { ViewModel } from './src/core-data-engine/viewmodel.js'

const app = express()

let mainView = new ViewModel()

//app.use(express.static(__dirname, {maxAge: 2592000000}))

app.listen(3000, function() {
  console.log('Listing on port 3000!')
})

