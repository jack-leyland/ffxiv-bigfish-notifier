import winston from "winston"
import CONFIG from "./config.js";

const errorFileTransport = new winston.transports.File({
    filename: `${CONFIG.LOG_FILE_PATH}/${Date.now()}-discord-error.log`,
    maxsize: 524288000,
    maxFiles: 3,
    level: 'warn'
})

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: 'discord-client' },
    transports: [
       errorFileTransport
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: `${CONFIG.LOG_FILE_PATH}/${Date.now()}-discord-crash.log`,
            maxsize: 524288000,
            maxFiles: 3,
        })
    ]
});

if (!CONFIG.IS_PRODUCTION) {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

