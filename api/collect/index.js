const util = require('util');
const events = require("../events/index.js");
const { FileStorer } = require("../SharedCode/filestorer.js"); // await cache.getCache(req.query.src);
const { Cache } = require("../SharedCode/cachepic.js"); // await cache.getCache(req.query.src);
//const fs = require('fs'); // synchronous
const { pid } = require('node:process');

const cache = Cache(FileStorer("client/pix"));
const admin = FileStorer("client");

/**
 * Concatenate and sort the events lists from all sources.
 * Get all the pictures and make local compressed copies in client/pix (if not already got).
 * Store the list in client/json ready to be served.
 */
async function collect(context) {
    // Get the lists from different promoters:
    let handlers = await events(context, { query: {} });
    let handlerNames = Object.keys(handlers);
    let toDo = {};
    handlerNames.forEach(n => toDo[n] = true);
    let eventsLists = {};
    await Promise.all(handlerNames.map(async n => {
        try {
            eventsLists[n] = await events(context, { query: { venue: n } })
            eventsLists[n].forEach(s => s.promoter = n);
            if (eventsLists[n].length > 0) {
                delete toDo[n];
                persistentStatus("Remaining sources: " + Object.keys(toDo).join(" "));
            }
        } catch (e) {
            fault(`Getting ${n} ${e.toString()}`)
        }
    }));

    // Concatenate and sort them:
    let shows = [];
    handlerNames.forEach(n => shows = shows.concat(eventsLists[n]));

    shows.sort((a, b) => (a.dt || 0) - (b.dt || 0));

    let showsUnduplicated = [];
    let previous = null;
    shows.forEach(show => {
        if (!previous
            || previous.title != show.title
            || previous.venue.substring(0, 6) != show.venue.substring(0, 6)
            || previous.image != show.image
        ) {
            showsUnduplicated.push(show);
            previous = show;
        }
    })

    let categories = {};
    showsUnduplicated.forEach(s => {
        categories[s.category] = 1 + (categories[s.category] || 0);
    })


    const storer = FileStorer("client/json");
    //storer.put("events-rawUrls.json", null, JSON.stringify(shows, null, "  "));

    // Cache the images and replace their URLs with our caches:
    await replaceImageUrls(showsUnduplicated);

    let package = {
        promoters: handlers,
        categories,
        shows: showsUnduplicated,
        toDo,
        faults,
        date: Date.now()
    };

    // Save the list:
    await storer.put("events.json", null, JSON.stringify(package, null, "  "));

}

async function replaceImageUrls(shows) {
    const showsLength = shows.length;
    for (let i = 0; i < showsLength; i++) {
        let show = shows[i];
        show.imagesource = show.image;
        if (show.image) {
            const cacheInfo = await cache.getCache(show.image, false);
            show.image = '/pix/' + cacheInfo.name;
        }
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
async function collectLock(set, testPid, testpath = ".collectLock") {
    const path = testpath;
    const lockKey = testPid || pid; // from process
    const lockFileExists = await admin.has(path);
    const got = lockFileExists ? (await admin.get(path)).split(" ") : [];

    if (!got.length || 0 + got[0] < Date.now() - 3000) {
        // Lock file doesn't exist or is out of date
        if (set) {
            // We can set it and claim it as ours:
            await admin.put(path, "text/plain", "" + Date.now() + " " + lockKey);
        }
    } else {
        // Lock file exists and is in date
        if (!set && (await admin.get(path)).indexOf(" " + lockKey) > 0) {
            // We want to clear it and it's ours to clear.
            await admin.put(path, "text/plain", "0 0");
        }
    }
    // If we've managed to set the lock, or if it was already set...
    let after = (await admin.get(path)).split(' ');

    return ((after?.length || 0) > 1 && 0 + after[0] > Date.now() - 3000 && after[1] == lockKey);

}

/**
 * Record a status message that persists between calls
 * @param {string} s If not empty, overwrite the status
 * @returns The most recent status
 */
async function persistentStatus(s) {
    const statusFile = ".status.txt"
    if (s) {
        //console.log("put status " + s);
        await admin.put(statusFile, "text/plain", s);
        return s;
    } else {
        return await admin.get(statusFile);
    }
}
function assert(condition, msg) {
    if (!condition) throw Error(msg);
}


var faults = [];
function fault(s) {
    console.log(s);
    faults.push(s);
}
function getFaults() {
    let v = faults.join("\n");
    faults.length = 0;
    return v;
}

async function testFilestore() {
    const tfr = "testFile";
    const tf = tfr + ".txt";
    await admin.delete(tf);
    assert(!await admin.has(tf), "1 Failed to delete " + tf);
    await admin.put(tf, "text/plain", "stuff");
    let n = await admin.has(tf);
    assert(n, "2 Failed to put " + tf);
    assert(n.name == tf, "3 Wrong name found: " + n.name);
    let n2 = await admin.has(tfr);
    assert(n?.name == tf, "4 Failed to find file from root");
    let r = await admin.get(tf);
    assert(r == "stuff", "5 Bad content: " + r);
    await admin.delete(tf);
    assert(!await admin.has(tf), "6 Failed to delete " + tf);
    await persistentStatus("Filestore tests OK");
    console.log("Filestore tests OK");
    return true;
}
async function testLocks() {
    console.log("Lock tests ...");
    assert(await collectLock(true, 42), "1 Failed to get lock 42");
    assert(await collectLock(true, 42), "2 Failed to confirm lock 42");
    assert(!await collectLock(true, 43), "3 Failed to refuse lock 43");
    await collectLock(false, 43);
    assert(!await collectLock(true, 43), "4 Cleared wrong lock");
    await collectLock(false, 42);
    assert(await collectLock(true, 43), "5 Failed to get lock 43");
    await collectLock(false, 43);
    await persistentStatus("Lock tests OK");
    console.log("Lock tests OK");
    return true;
}
async function testCache() {
    const target = "https://moylgrove.wales/wp-content/uploads/2021/10/hall-6-1.png";
    const testFilestore = FileStorer("client/testpix");
    const testCache = Cache(testFilestore);
    await testCache.purge();
    let r = await testCache.getCache(target, false);
    assert(r.name?.length > 10 && r.name?.length < 30, "1 Cached name length " + r.name);
    assert(!r.wasCached, "2 wasCached");
    assert(await testFilestore.has(r.name), "3 No cache file " + r.name);
    let r2 = await testCache.getCache(target, false);
    assert(r2.name?.length > 10 && r.name?.length < 30, "4 Cached name length " + r.name);
    assert(r2.wasCached, "5 wasn't Cached");
    await testCache.purge();
    assert(!await testFilestore.has(r2.name), "6 Failed to purge");
    await persistentStatus("Cache tests OK");
    console.log("Cache tests ok");
    return true;
}

/**
 * Start or check progress of a collection operation
 * @param {*} context 
 * @param {*} req query.go --> Start the operation; otherwise check progress
 */
module.exports = async function (context, req) {
    let r = { status: "idle" };
    // if (Object.keys(req.query).length) console.log("collect req ", req );
    try {
        if (req.query.go) {
            if (await collectLock(true)) {
                await persistentStatus("in progress");
                collect(context)  // NB no await
                    .then(() => { collectLock(false); persistentStatus("Done " + getFaults()); })
                    .catch(e => { collectLock(false); persistentStatus(e.stack); });

                r.status = "started";
            } else {
                r.status = "already in progress";
            }
        } else if (req.query.purge) {
            const r = await cache.purge();
            await persistentStatus("Done purge " + r);
        } else if (req.query.url) {
            if (await collectLock(true)) {
                try {
                    const cacheInfo = await cache.getCache(req.query.url, false);
                    cachedName = '/pix/' + cacheInfo.name;
                    await persistentStatus("Done " + JSON.stringify(cacheInfo));
                }
                catch (e) {
                    console.log(e.stack);
                }
                finally {
                    collectLock(false);
                }
            } else {
                console.log("not got lock");
            }
        } else if (req.query.test) {
            await persistentStatus("Starting tests...");
            await testFilestore();
            await testLocks();
            await testCache();
            await persistentStatus("Done tests ok");
        } else {
            r = { status: await persistentStatus() }
        }

        context.res = {
            body: JSON.stringify(r),
            headers: { "Content-Type": "application/json" },
            status: 200
        }
    }
    catch (e) {
        console.log(e);
        context.res = {
            status: 200,
            body: e.stack
        }
    }
    return r;
}
module.exports.test = { collectLock, persistentStatus };


