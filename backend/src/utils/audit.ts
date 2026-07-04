import winston from 'winston';
import path from 'path';

// Define log level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Configure formats
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
  )
);

// Define transports (Console & Log Files)
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  new winston.transports.File({ filename: path.join(__dirname, '../../logs/all.log') }),
];

// Create the logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels: winston.config.npm.levels,
  format,
  transports,
});

export default logger;
