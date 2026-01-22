import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logsBaseDir = path.join(__dirname, '../logs');

if (!fs.existsSync(logsBaseDir)) {
  fs.mkdirSync(logsBaseDir, { recursive: true });
}

const getLogDir = () => {
  const date = new Date().toISOString().split('T')[0];
  const logDir = path.join(logsBaseDir, date);
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  return logDir;
};

const getLogFileName = (level) => {
  const logDir = getLogDir();
  return path.join(logDir, `${level}.log`);
};

const writeLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logFile = getLogFileName(level);
  
  let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    logMessage += `\n${JSON.stringify(data, null, 2)}`;
  }
  
  logMessage += '\n';
  
  fs.appendFileSync(logFile, logMessage, 'utf8');
};

export const logger = {
  error: (message, data = null) => {
    writeLog('error', message, data);
  },
  
  warn: (message, data = null) => {
    writeLog('warn', message, data);
  },
  
  info: (message, data = null) => {
    writeLog('info', message, data);
  },
  
  debug: (message, data = null) => {
    writeLog('debug', message, data);
  }
};
