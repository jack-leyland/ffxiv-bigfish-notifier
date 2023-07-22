import * as dotenv from 'dotenv'
import path from "path"
const __dirname = path.resolve();
dotenv.config({ path: path.resolve(__dirname, "./src/discord-client/.env") })

const CONFIG = {
    IS_PRODUCTION: process.env.NODE_ENV === "production",
    LOG_FILE_PATH: process.env.LOG_FILE_PATH,
    PORT: process.env.PORT,
    ROOT_SUBSCRIPTION_ENDPOINT: process.env.ROOT_SUBSCRIPTION_ENDPOINT
}

if (CONFIG.IS_PRODUCTION) {
    CONFIG.TOKEN = process.env.BOT_TOKEN 
    CONFIG.CLIENT_ID = process.env.CLIENT_ID 
} else {
    CONFIG.TOKEN = process.env.DEV_BOT_TOKEN
    CONFIG.CLIENT_ID = process.env.DEV_CLIENT_ID
    CONFIG.TESTING_SERVER_ID = process.env.TESTING_SERVER_ID
}

export default CONFIG