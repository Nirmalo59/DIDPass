import fs from 'fs';
import path from 'path';

// Define the absolute path for the physical log file
const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'verified_logs.jsonl');

/**
 * Appends a log entry to a physical file (JSON Lines format).
 * This acts as the Append-Only Authoritative Storage.
 */
export function appendToPhysicalLog(logData: any) {
  try {
    // 1. Ensure the logs directory exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // 2. Format the log entry
    // We stringify the data on a single line so it conforms to the JSON Lines standard
    const logLine = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...logData
    }) + '\n';

    // 3. Append to the file synchronously to ensure authoritative order
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');

  } catch (error) {
    console.error("CRITICAL FAILURE: Could not write to physical append-only log file.", error);
  }
}
