import { Router } from 'express';
const router = Router()

export const usersRouter = (notifcationService) => {
    router.post('/',
        async (req, res, next) => {
            if (!req.body.id || !req.body.strategy) {
                res.status(400).end()
                return
            }
            try {
                await notifcationService.registerUser(req.body.strategy, req.body.id)
                res.json({
                    success: true
                })
            } catch (err) {
                if (err.type && err.type === "UserAlreadyExistsError") {
                    res.json({
                        success: false,
                        userExists: true
                    })
                } else {
                    res.status(500).send()
                }
            }
        }
    )

    router.delete('/',
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
                await notifcationService.removeUser("discord", req.query.id)
                res.json({
                    success:true, 
                })
            } catch (err) {
                res.status(500).send()
            }
        }
    )

    return router
}
