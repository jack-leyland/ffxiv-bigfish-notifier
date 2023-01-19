import pg from "pg"
const {Client} = pg
import { v4 as uuid } from 'uuid'

import {logger} from '../common/logger.js'
import { Tables } from "./tables.js"
import { InternalDatabaseError, UserAlreadyExistsError } from '../notification-service/Errors.js'
import { CONFIG } from '../common/config.js'

class DatabaseClient {
    constructor(isProd) {
        try {
            let connectionString = CONFIG.IS_PRODUCTION ? CONFIG.DB_URL : CONFIG.TEST_DB_URL
            this.client = new Client({connectionString,})
            this.client.connect()
            logger.info(isProd ? "Production " : "Development " + "DB connection extablished.")
        } catch (err) {
            logger.error(err)
            throw new InternalDatabaseError(`Unable to connect to database.`)
        }
    }

    async initializeTables() {
        try 
        {
            for (const table of Tables) {
                await this.client.query(table)
            }
        } catch (err) {
            logger.error(err)
            throw new InternalDatabaseError(`Failed to initialize database tables`)
        }
    }

    async getUserIdFromDiscordId(discordId) {
        let values = [discordId]
        let query = `SELECT user_id FROM users WHERE discord_id=$1`
        let res = await this.client.query(query,values)
            .then(res => {
                return res.rows[0]
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to fetch userId for Discord ID: ${discordId}`)
            })
        return res
    }

    async getUserNotifcationStrategies(userId) {
        let query = `SELECT strategy FROM notification_strategies 
                    WHERE user_id=$1`
        let res = await this.client.query(query, [userId])
            .then(res => {
                return res.rows
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to retrieve notfication strategies for userId: ${userId}`)
            })
        return res
    }

    async getAllUserIds() {
        let res =  await this.client.query('SELECT user_id FROM users')
            .then(res => {
                return res.rows
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError("Unable to retreive userIds.")
            })
        return res
    }

    async getAllUserIdentities(userId) {
        let values = [userId]
        let query = `SELECT * FROM users WHERE user_id=$1`
        let res = await this.client.query(query,values)
            .then(res => {
                return res.rows[0]
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Unable to retrieve identities for userId: ${userId}`)
            })
        return res
    }

    async createNewDiscordUserRecord(discordId) {
        let id = uuid()
        let userValues= [id, discordId]
        let userQuery = `INSERT INTO users(user_id, discord_id) VALUES($1, $2)`
        let strategyQuery = `INSERT INTO notification_strategies VALUES($1, $2)`
        let strategyValues = [id, "discord"]
        try {
            await this.client.query("BEGIN")
            await this.client.query(userQuery, userValues)
            await this.client.query(strategyQuery, strategyValues)
            await this.client.query("COMMIT")
        } catch (err) {
            await this.client.query("ROLLBACK")

            if (err.constraint === 'unique_discord_id') {
                throw new UserAlreadyExistsError(`Discord user ID ${discordId} already exists.`)
            } else {
                logger.error(err)
                throw new InternalDatabaseError('Failed to create new user.')
            }
        }
    }

    async deleteDiscordUserRecord(discordId) {
        try {
            await this.client.query(`DELETE FROM users WHERE discord_id=$1`, [discordId])
        } catch (err) {
            logger.error(err)
            throw new InternalDatabaseError(`Failed to delete discord ID: ${discordId}`)
        }
    }

    async getAllSubscribableFish() {
        let fish  = this.client.query(`SELECT * FROM fish WHERE big_fish=TRUE AND always_available=false`)
            .then(res => {
                return res.rows
            })
            .catch( err => {
                logger.error(err)
                throw new InternalDatabaseError("Failed to retrieve fish records")
            })
        return fish
    }

    async getFishById(id) {
        let res = await this.client.query(
            `SELECT * FROM fish WHERE fish_id=$1`,
            [id])
            .then(res => {
                return res.rows[0]
            })
            .catch( err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to retreive fishId from fish table: ${id}`)
            })
        return res
    }

    async getSubscribableFishByName(name) {
        let queryText = 'SELECT * from fish WHERE name_en LIKE $1 AND always_available=false'
        let res = await this.client.query(queryText, [name.toLowerCase()])
        .then(res => {
            return res.rows[0]
        })
        .catch(err => {
            logger.error(err)
            throw new InternalDatabaseError(`Error locating fish record with name: ${name}`)
        })
        return res
    }

    async getTimedIntuitionRequirementsForFish(parentFishId) {
        let query = `SELECT intuition_fish_id 
                    FROM intuition_requirements AS i
                    JOIN fish AS f on f.fish_id=i.intuition_fish_id 
                    WHERE i.fish_id=$1 AND f.always_available=FALSE`
        let res = await this.client.query(query, [parentFishId])
            .then(res => {
                return res.rows
            })
            .catch (err => {
                logger.error(err)
                throw new InternalDatabaseError(`Error fetching intuition requirements for fishId: ${parentFishId}`)
            })
        return res
    }

    /**
     * This does the opposite of getTimedIntuitionRequirementsForFish.
     * It returns the parent fish_id that require the give intuition fishId. 
     * This is meant to be used by the notifcation services to populate the info
     * the user sees.
     */
    async getReverseIntuitionRequirements(fishId) {
        let query = `SELECT intuition_fish_id FROM intuition_requirements 
                    WHERE fish_id=$1`
        let res = await this.client.query(query, [parentFishId])
            .then(res => {
                return res.rows
            })
            .catch (err => {
                logger.error(err)
                throw new InternalDatabaseError(`Error fetching intuition requirements for fishId: ${parentFishId}`)
            })
        return res
    }

    /**
     * Returns the new subscription id if the insert is successful. 
     * Otherwise, if the unique_fish_condition constraint is violated,
     * then we return null. Only throw for any other error.
     */
    async addSubscriptionIfNew(userId, fishId, condition) {
        let subId = uuid()
        let values = [subId, userId, fishId, condition]
        let query = `INSERT INTO fish_subscriptions VALUES($1, $2, $3, $4)`
        let newIdOnSucces = await this.client.query(query, values)
            .then(_ => {
                return subId
            })
            .catch(err => {
                if (err.constraint === 'unique_fish_condition') {
                    return null
                } else {
                    logger.error(err)
                    throw new InternalDatabaseError(`Failed to add subscription with parameters: 
                    userId:${userId},
                    fishId:${fishId},
                    condition:${condition},
                    `)
                }
            })
        return newIdOnSucces
    }

    async addIntuitionSubscription(parentSubId, userId, fishId, condition) {
        let intuitionId = uuid()
        let values = [intuitionId, parentSubId, userId, fishId, condition]
        let query = `INSERT INTO intuition_subscriptions VALUES($1, $2, $3, $4, $5)`
        await this.client.query(query, values)
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to add intuition subscription with parameters: 
                parentSubId:${parentSubId},
                userId:${userId},
                fishId:${fishId},
                condition:${condition},
                `)
            })
    }

    async getSubscriptionId(userId, fishId, condition) {
        let values = [userId, fishId, condition]
        let query = `SELECT subscription_id FROM fish_subscriptions 
                    WHERE user_id=$1 AND fish_id=$2 AND minutes_condition=$3`
        let res = await this.client.query(query, values)
            .then(res => {
                return res.rows[0]
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to get subscription Id with parameters: 
                userId:${userId},
                fishId:${fishId},
                condition:${condition},
                `)
            })
        return res
    }

    async deleteSubscription(subId) {
        let query = `DELETE FROM fish_subscriptions WHERE subscription_id=$1`
        await this.client.query(query, [subId])
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Unable to delete subscriptionId: ${subId}`)
            })
    }

    async getAllUserSubscriptions(userId) {
        let query =`SELECT 
                    subs.fish_id, 
                    fish.name_en, 
                    subs.minutes_condition
                    FROM 
                        ((SELECT fish_id, minutes_condition 
                        FROM fish_subscriptions
                        WHERE user_id=$1)
                        UNION
                        (SELECT fish_id, minutes_condition 
                        FROM intuition_subscriptions
                        WHERE user_id=$1)) AS subs 
                    JOIN fish ON (subs.fish_id=fish.fish_id)
                    `
        let res = await this.client.query(query, [userId])
            .then(res => {
                return res.rows
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to get all subscriptions for userId: ${userId}`)
            })
        return res
    }

    async getFishSubscriptionDetails(userId, fishId) {
        let values = [userId, fishId]
        let query = `SELECT
                    subscription_id, 
                    fish_id, 
                    minutes_condition,
                    CASE 
                    WHEN (SELECT 1 FROM intuition_subscriptions 
                        WHERE parent_subscription_id=subscription_id LIMIT 1)=1
                    THEN TRUE
                    ELSE FALSE
                    END AS has_intuition
                    FROM fish_subscriptions
                    WHERE user_id=$1 AND fish_id=$2` 
        let res = await this.client.query(query, values)
            .then(res => {
                return res.rows
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to get subscription details for userId: ${userId}, fishId:${fishId}`)
            })
        return res
    }

    async subscriptionIncludesIntuitionFish(userId, fishId, condition) {
        let values = [userId, fishId, condition]
        let query = `SELECT 1 FROM intuition_subscriptions
                    WHERE EXISTS (
                        SELECT subscription_id FROM fish_subscriptions
                        WHERE user_id=$1 AND fish_id=$2 AND minutes_condition=$3
                    )`
        let res = await this.client.query(query, values)
            .then(res => {
                return res.rows[0]
            })
            .catch(err => {
                logger.error(err)
                throw new InternalDatabaseError(`Failed to verify intuition subscriptions with parameters: 
                userId:${userId},
                fishId:${fishId},
                condition:${condition},
                `)
            })
        return res
    }

    async upsertFishRecord(fishId, name_en, intuitionFish, bigFish, alwaysAvailable) {
        let fishQuery = 
            `INSERT INTO fish VALUES($1, $2, $3, $4) 
            ON CONFLICT (fish_id) 
            DO UPDATE
                SET (name_en, always_available, big_fish) = ($2, $3, $4)`
        let fishValues = [fishId, name_en.toLowerCase(), alwaysAvailable, bigFish]
        let intuitionQuery = 
            `INSERT INTO intuition_requirements VALUES($1, $2) 
            ON CONFLICT (fish_id, intuition_fish_id) DO NOTHING`
        let intuitionValues = [fishId, null]
        try {
            await this.client.query('BEGIN')
            await this.client.query(fishQuery, fishValues)
            // We delete the existing requirements from the fishId in question, 
            // and then repopulate. This seems to be easier than trying to 
            // check for any stale ones if that ever happens.
            await this.client.query(`DELETE FROM intuition_requirements WHERE fish_id=$1`, [fishId]) 
            for (const id of intuitionFish) {
                intuitionValues[1] = id
                await this.client.query(intuitionQuery, intuitionValues)
            }
            await this.client.query('COMMIT')
        } catch (err) {
            await this.client.query('ROLLBACK')
            logger.error(err)
            throw new InternalDatabaseError(`Failed to upsert fish record`)
        }
    }
}

const database = new DatabaseClient(CONFIG.IS_PRODUCTION)
export default database