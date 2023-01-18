import { Router } from 'express';
import database from '../db/db.js';
const router = Router()

export const subscriptionsRouter = (notifcationService) => {
    router.get('/',
        async (req, res, next) => {
            if (!req.query.strategy || !req.query.id) {
                res.status(400).send()
                return
            }
            if (req.query.strategy !== "discord") {
                res.status(400).send()
                return
            }

            try {
                let row = await database.getUserIdFromDiscordId(req.query.id)
                if (!row) {
                    res.json({
                        success: false,
                        reason: "User Not Found"
                    })
                    return
                }
                let data;
                if (req.query.fishName) {
                    data = await notifcationService.getUserSubscriptionsForFish(row.user_id, req.query.fishName)
                } else {
                    data = await notifcationService.getAllUserSubscriptions(row.user_id)
                }
                res.json({
                    success: true,
                    subscriptions: JSON.stringify(data)
                })
            } catch (err) {
                if (err.type && err.type === "FishNameNotFoundError") {
                    res.json({
                        success: false,
                        reason: "Invalid Fish Name"
                    })
                } else {
                    res.status(500).send()
                }
            }
        }
    )

    router.post('/',
        async (req, res, next) => {
            if (!req.body.id || !req.body.strategy) {
                res.status(400).send()
                return
            }
            if (!req.body.fishName || !req.body.minutes || req.body.intuition === undefined) {
                res.status(400).send()
                return
            }
            // This is where problems are going to begin when we decide to
            // accept requests for other notification strategies (if
            // that ever gets implemented). For now we only allow discord.
            if (req.body.strategy !== "discord") {
                res.status(400).send()
                return
            }

            try {
                let row = await database.getUserIdFromDiscordId(req.body.id)
                if (!row) {
                    res.json({
                        success: false,
                        reason: "User Not Found"
                    })
                    return
                }
                await notifcationService.subscribeToFish(row.user_id, req.body.fishName, req.body.minutes, req.body.intuition)
                res.json({
                    success: true
                })
            } catch (err) {
                if (err.type && err.type === "UnsupportedNotificationPeriodError") {
                    res.json({
                        success: false,
                        reason: "Invalid Notification Period"
                    })
                } else if (err.type && err.type === "FishNameNotFoundError") {
                    res.json({
                        success: false,
                        reason: "Invalid Fish Name"
                    })
                } else if (err.type && err.type === "SubscriptionAlreadyExistsError") {
                    res.json({
                        success: false,
                        reason: "Already Subscribed"
                    })
                } else {
                    res.status(500).send()
                }
            }
        }
    )

    router.delete('/',
        async (req, res, next) => {
            if (!req.query.strategy || !req.query.subId) {
                console.log("herre")
                res.status(400).send()
                return
            }
            if (req.query.strategy !== "discord") {
                res.status(400).send()
                return
            }

            try {
                await notifcationService.deleteSubscription(req.query.subId)
                res.json({
                    success: true
                })
            } catch (err) {
                res.status(500).send()
            }
        }
    )
    
    return router
}
