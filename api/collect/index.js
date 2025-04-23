const events = require("../events/index.js");
const { Cache, FileStorer } = require("../SharedCode/localpic.js"); // await cache.getCache(req.query.src);
const fs = require('fs'); // synchronous
const { pid } = require('node:process');

const cache = Cache(FileStorer());


/**
 * Grab or release a lock
 * @param {bool} true = try to set the lock
 * @returns whether this process has the lock
 */
function collectLock(set, testPid, testpath=".collectLock") {
    const path = testpath;
    const lockKey = testPid || pid; // from process
    const stat = fs.statSync(path, { throwIfNoEntry: false });
    if (!stat || stat.mtimeMs < Date.now() - 3000) {
        // Lock file doesn't exist or is out of date
        if (set) {
            // We can set it and claim it as ours:
            fs.writeFileSync(path, "" + lockKey, { encoding: 'utf8', flush: true });
        }
    } else {
        // Lock file exists and is in date
        if (!set && fs.readFileSync(path, { encoding: 'utf8' }) == lockKey) {
            // We want to clear it and it's ours to clear.
            // Make it out of date:
            fs.utimesSync(path, 0, 0);
        }
    }
    // If we've managed to set the lock, or if it was already set...
    let statAfter = fs.statSync(path, {throwIfNoEntry:false});
    return (!!statAfter && statAfter.mtimeMs > Date.now() - 3000 && fs.readFileSync(path, { encoding: 'utf8' }) == lockKey);
}

module.exports = async function (context, req) {
    try {

        if (!collectLock()) {
            collect();
        }

        context.res = {
            body: JSON.stringify(r),
            headers: { "Content-Type": "application/json" },
            status: 200
        }
    }
    catch (e) {
        context.res = {
            status: 490,
            body: e.toString()
        }
    }
}
module.exports.test = { collectLock };


