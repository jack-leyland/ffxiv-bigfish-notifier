import winston from "winston"
import { CONFIG } from './config.js';

const errorFileTransport = new winston.transports.File({
    filename: `${CONFIG.LOG_FILE_PATH}/${Date.now()}-error.log`,
    maxsize: 524288000,
    maxFiles: 3,
    level: 'warn'
})

const infoFileTransport = new winston.transports.File({
    filename: `${CONFIG.LOG_FILE_PATH}/${Date.now()}-data-engine.log`,
    maxsize: 209715200,
    maxFiles: 3,
    level: 'info'
})

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: 'timer-service' },
    transports: [
       errorFileTransport
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: `${CONFIG.LOG_FILE_PATH}/${Date.now()}-crash.log`,
            maxsize: 524288000,
            maxFiles: 3,
        })
    ]
});

export const dataSourceLogger  =winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: 'fish-data-engine' },
    transports: [
       infoFileTransport
    ],
});



if (!CONFIG.IS_PRODUCTION) {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
    dataSourceLogger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

