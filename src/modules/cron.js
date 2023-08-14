const { job } = require("cron");

module.exports = (ms, callback) => {
    let now = Date.now();

    const j = job({
        cronTime: new Date(now + ms),
        onTick: callback
    });

    j.start();
};