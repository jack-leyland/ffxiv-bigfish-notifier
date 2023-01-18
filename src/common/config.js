import * as dotenv from 'dotenv'
import path from "path"
const __dirname = path.resolve();
dotenv.config()

export const CONFIG = {
    //Overridden manually by db refresh script
    DB_FISH_DATA_REFRESH: false,
    IS_PRODUCTION: process.env.NODE_ENV === "production",
    TEST_DB_URL: process.env.TEST_DB_URL,
    DB_URL: process.env.DB_URL,
    LOG_FILE_PATH: process.env.LOG_FILE_PATH,
    PORT: process.env.PORT,
}