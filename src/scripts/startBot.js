const path = require('path');
const envPath = path.resolve(__dirname, '../../config/.env');
require('dotenv').config({ path: envPath });
//use the config provided in the start command
const configFileName = process.env.CONFIG_FILE;
const configPath = path.resolve(__dirname, '../../config', configFileName);
const config = require(configPath);

const tradingController = require('../controllers/tradingController');
const subscriptionController = require('../controllers/subscriptionController');

async function startBot() {
    subscriptionController.subscribeToAll(config);
    tradingController.initialize(config);
}

startBot();
