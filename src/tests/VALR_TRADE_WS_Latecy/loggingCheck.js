const { Worker } = require('worker_threads');

function createWorker(streamFile) {
    const worker = new Worker(streamFile);
    worker.on('message', (data) => {
        timeEnd = Date.now() 
        console.log(`[${new Date().toISOString()}],`, data,`,${timeEnd}`);
    });
    return worker;
}

const workerAOB = createWorker('./AGGREGATED_ORDERBOOK_UPDATE.js');
const workerFOBU = createWorker('./FULL_ORDERBOOK_UPDATE.js');
const workerOB1 = createWorker('./OB_L1_D1_SNAPSHOT.js');
const workerOB5 = createWorker('./OB_L1_D5_SNAPSHOT.js');
