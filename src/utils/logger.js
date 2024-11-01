const fs = require('fs');
const path = require('path');

const logsDirPath = path.join(__dirname, 'logs');
const MAX_FILE_SIZE = 4194304; // 4MB

// Helper function to create new log file with an incremented number
function getRotatedLogFileName(baseFileName) {
    let index = 1;
    let newFilePath = path.join(logsDirPath, `${baseFileName}_${index}.txt`);

    // Keep checking for the next available file name
    while (fs.existsSync(newFilePath) && fs.statSync(newFilePath).size > MAX_FILE_SIZE) {
        index++;
        newFilePath = path.join(logsDirPath, `${baseFileName}_${index}.txt`);
    }

    return newFilePath;
}

// Function to log messages to a file, with rotation if size exceeds limit
function logToFile(message, filePath) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}, ${message}\n`;

    fs.appendFile(filePath, logMessage, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

// Function to check file size and rotate if necessary
function checkFileSizeAndLog(message, filePath) {
    fs.stat(filePath, (err, stats) => {
        if (err && err.code === 'ENOENT') {
            // File does not exist, create a new one
            logToFile(message, filePath);
        } else if (stats && stats.size > MAX_FILE_SIZE) {
            // File size exceeds limit, rotate the log
            const newFilePath = getRotatedLogFileName(path.basename(filePath, '.txt'));
            logToFile(message, newFilePath);
        } else {
            // File exists and is within size limits, append to it
            logToFile(message, filePath);
        }
    });
}

// Main function to log premium feed data
function logPremiumFeed(market, message) {
    const baseFileName = `${market}_pricefeed_logs`;
    const filePath = path.join(logsDirPath, `${baseFileName}.txt`);
    checkFileSizeAndLog(message, filePath);
}

// Main function to log execution data
function logExecution(market, message) {
    const executionlogFilePath = path.join(logsDirPath, `${market}_execution_logs.txt`);
    logToFile(message, executionlogFilePath);
}

module.exports = {
    logExecution,
    logPremiumFeed
};
