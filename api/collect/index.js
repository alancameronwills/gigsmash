const events = require("../events/index.js");
const { Cache, FileStorer } = require("../SharedCode/localpic.js"); // await cache.getCache(req.query.src);
const fs = require('fs'); // synchronous
const { pid } = require('node:process');

const cache = Cache(FileStorer("client/pix"));

/**
 * Concatenate and sort the events lists from all sources.
 * Get all the pictures and make local compressed copies in client/pix (if not already got).
 * Store the list in client/json ready to be served.
 */
async function collect(context) {
    // Get the lists from different promoters:
    let {handlerNames, eventsLists, toDo, faults} = await getSources(context);

    // Concatenate and sort them:
    let shows = [];
    handlerNames.forEach(n => shows = shows.concat(eventsLists[n]));
    shows.sort((a, b) => a.dt - b.dt);

    
    const storer = FileStorer("client/json");
    //storer.put("events-rawUrls.json", null, JSON.stringify(shows, null, "  "));

    // Cache the images and replace their URLs with our caches:
    await replaceImageUrls(shows);

    // Save the list:
    storer.put("events.json", null, JSON.stringify(shows, null, "  "));

}


async function getSources(context) {
    let handlers = await events(context, { query: {} });
    let handlerNames = Object.keys(handlers);
    let toDo = {};
    let faults = [];
    handlerNames.forEach(n => toDo[n] = true);
    let eventsLists = {};
    await Promise.all(handlerNames.map(async n => {
        try {
            eventsLists[n] = await events(context, { query: { venue: n } })
            eventsLists[n].forEach(s => s.promoter = n);
            if (eventsLists[n].length > 0) {
                delete toDo[n];
                persistentStatus("Remaining sources: " + Object.keys(toDo).length);
            }
        } catch (e) {
            faults.push(`Getting ${n} ${e.toString()}`)
        }
    }));
    return {handlerNames:handlerNames, eventsLists:eventsLists, toDo: toDo, faults: faults}
}

async function replaceImageUrls (shows) {
    const showsLength = shows.length;
    for (let i = 0; i<showsLength; i++) {
        let show = shows[i];
        show.imagesource = show.image;
        const cacheInfo = await cache.getCache(show.image, false);
        show.image = '/pix/' + cacheInfo.name;
        persistentStatus(`Converting images: ${i} / ${showsLength}`);
    }
}

/**
 * Delete local pictures in client/pix that are not referenced in the latest collected events in client/json
 */
async function purgepix() {

}

/**
 * Grab or release a lock
 * @param {bool} true = try to set the lock
 * @returns whether this process has the lock
 */
function collectLock(set, testPid, testpath = ".collectLock") {
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
    let statAfter = fs.statSync(path, { throwIfNoEntry: false });
    return (!!statAfter && statAfter.mtimeMs > Date.now() - 3000 && fs.readFileSync(path, { encoding: 'utf8' }) == lockKey);
}

/**
 * Record a status message that persists between calls
 * @param {string} s If not empty, overwrite the status
 * @returns The most recent status
 */
function persistentStatus(s) {
    const statusFile = ".status.txt"
    if (s) {
        fs.writeFileSync(statusFile, s, { encoding: 'utf8', flush: true });
        //console.log(s);
        return s;
    } else {
        return fs.existsSync(statusFile) && fs.readFileSync(statusFile, { encoding: 'utf8' }) || "nothing recent";
    }
}

/**
 * Start or check progress of a collection operation
 * @param {*} context 
 * @param {*} req query.go --> Start the operation; otherwise check progress
 */
module.exports = async function (context, req) {
    let r = { status: "idle" };
    try {
        if (req.query.go) {
            if (collectLock(true)) {
                persistentStatus("in progress");
                collect(context)  // NB no await
                    .then(() => { collectLock(false); persistentStatus("Done"); })
                    .catch(e => { collectLock(false); persistentStatus(e.stack); });

                r.status = "started";
            } else {
                r.status = "already in progress";
            }
        } else {
            r = { status: persistentStatus() }
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
    return r;
}
module.exports.test = { collectLock, persistentStatus };


