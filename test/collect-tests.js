const test = require('node:test');
const assert = require('node:assert');
const { FileStorer } = require("../api/SharedCode/filestorer.js");
const fs = FileStorer("client");

const collectApi = require("../api/collect/index.js");
const { collectLock, persistentStatus } = collectApi.test;

function sleep(t) {
    return new Promise(r => setTimeout(() => { r() }, t))
}


test('collect', async (t) => {
    await t.test('lock', async (t) => {
        const tp = ".lock-test";
        await fs.delete(tp);
        assert(! await collectLock(false, 42, tp), "0. Failed to clear lock 42");
        assert(await collectLock(true, 42, tp), "1. Failed to set lock 42");
        assert(!await collectLock(true, 43, tp), "2. Erroneously set lock 43");
        assert(!await collectLock(false, 42, tp), "3. Failed to clear lock 42");
        assert(await collectLock(true, 43, tp), "4. Failed to set lock 43");
        assert(!await collectLock(true, 42, tp), "5. Erroneously set lock 42");
        assert(!await collectLock(false, 43, tp), "6. Failed to clear lock 43");
    });
    await t.test('persistentStatus', async (t) => {
        let msg = "msg1";
        assert(await persistentStatus(msg) == msg, "1. Failed to write status");
        assert(await persistentStatus() == msg, "2. Failed to retrieve status");
        msg = "msg2";
        assert(await persistentStatus(msg) == msg, "3. Failed to overwrite status");
        assert(await persistentStatus() == msg, "4. Failed to retrieve revised status");
    });
    await t.test('collection', async (t) => {
        try {
            await fs.purge();
            collectApi({ res: { status: 200, body: "" } }, { query: { "go": 1 } });
            await waitForCollectDone();
            await (async () => {
                return await new Promise((r, j) => { setTimer(async () => { r() }, 1000) })
            })
            await sleep(2000);
            let events = JSON.parse(await fs.get("json/events.json"));

            assert(Object.keys(events.promoters).length > 10, "Events list: Missing promoters");
            assert(events.shows.length > 100, "Events list: missing shows");
            assert(events.faults.length == 0, "Events list: Faults");
            let ff = [];
            let asrt = (b,m) => {if(!b)ff.push(m)};
            events.shows.forEach((s,i) => {
                asrt(s.url, "Event with no URL " + i);
                asrt(s.url.indexOf("https://")==0, "Bad url " + s.url);
                asrt(s.dt, "No dt " + s.url);
                asrt(s.category, "No category: " + s.url);
                asrt((s.image?.length||0)>10, "No image: "+s.url);
                asrt(s.image.match(/^\/pix\/[0-9]+\.[a-z]+$/), "Bad image name " + s.image);
            });
            assert(ff.length==0, "Event content faults: "+ff.join("\n"));


        } catch (e) { console.log(e); assert(false, e.toString()); }
    });
})

async function waitForCollectDone() {
    let p = new Promise((resolve, reject) => {
        let count = 0;
        let timer = setInterval(async () => {
            let context = { res: { status: 200, body: "" } };
            let r = await collectApi(context, { query: {} });
            if (!r.status) reject("CollectApi: No status returned");
            if (r.status.indexOf("rror") > 0) reject("CollectApi: " + r.status);
            if (r.status == "Done") {
                clearInterval(timer);
                resolve();
            }
            if (r.status.indexOf("Remaining") >= 0) process.stdout.write("+");
            if (r.status.indexOf("Converting") >= 0) {
                let m = r.status.match(/Converting.*?: +([0-9]+)[ \/]+([0-9]+)/);
                let progress = Math.floor(10 * m[1] / m[2]);
                process.stdout.write("" + progress);
            }
            if (count++ > 300) {
                clearInterval(timer);
                reject("Collect timed out")
            }
        }, 1000);
    })
    return await p;
}
