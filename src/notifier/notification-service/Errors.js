/**
 * Custom error classes for the notifier.
 *
 * The general error handling approach here is as follows:
 * - Certain errors are expected, such as in the case of the violation 
 *   of a db constraints for exisisting users or bad parameters to the
 *   registerUser method.
 * 
 * - Other than these cases, and especially for database errors and anything
 *   uncaught, the process should respond to the request that caused the error,
 *   log, and restart.
 *
 */


/**
 * Generic Internal Error to elevate to client after logging and handling 
 * something more specific lower down in the app.
 */
export class InternalError extends Error {
    constructor() {
        super(`An Internal Error Occured`)
        this.type = "InternalError"
    }
}


export class InternalDatabaseError extends Error {
    constructor(message) {
        super(`[INTERNAL DATABASE ERROR] ${message}`)
        this.type = "InternalDatabaseError"
    }
}

export class InvalidInputError extends Error {
    constructor(message) {
        super(message)
        this.type = "InvalidInputError"
    }
}

export class UserAlreadyExistsError extends Error {
    constructor(message) {
        super(message)
        this.type = "UserAlreadyExistsError"
    }
}

export class UserNotFoundError extends Error {
    constructor() {
        super()
        this.type = "UserNotFoundError"
    }
}


export class UnsupportedNotificationPeriodError extends Error {
    constructor() {
        super()
        this.type = "UnsupportedNotificationPeriodError"
    }
}

export class FishNameNotFoundError extends Error {
    constructor() {
        super()
        this.type = "FishNameNotFoundError"
    }
}

export class SubscriptionAlreadyExistsError extends Error {
    constructor() {
        super()
        this.type = "SubscriptionAlreadyExistsError"
    }
}