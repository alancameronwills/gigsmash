const test = require('node:test');
const assert = require('node:assert');

const fsp = require('fs/promises');

const collectApi = require("../api/collect/index.js");
const { collectLock, persistentStatus } = collectApi.test;


test('collect', async (t) => {
    await t.test('lock', async (t) => {
        const tp = ".lock-test"
        await fsp.rm(tp, { force: true });
        assert(!collectLock(false, 42, tp), "0. Failed to clear lock 42");
        assert(collectLock(true, 42, tp), "1. Failed to set lock 42");
        assert(!collectLock(true, 43, tp), "2. Erroneously set lock 43");
        assert(!collectLock(false, 42, tp), "3. Failed to clear lock 42");
        assert(collectLock(true, 43, tp), "4. Failed to set lock 43");
        assert(!collectLock(true, 42, tp), "5. Erroneously set lock 42");
        assert(!collectLock(false, 43, tp), "6. Failed to clear lock 43");
    });
    await t.test('persistentStatus', async (t) => {
        let msg = "msg1";
        assert(persistentStatus(msg) == msg, "1. Failed to write status");
        assert(persistentStatus() == msg, "2. Failed to retrieve status");
        msg = "msg2";
        assert(persistentStatus(msg) == msg, "3. Failed to overwrite status");
        assert(persistentStatus() == msg, "4. Failed to retrieve revised status");
    });
    await t.test('collection', async (t) => {
        try {
            await fsp.rm("client/pix", { recursive: true, force: true });
            await fsp.rm("client/json", { recursive: true, force: true });
            collectApi({ res: { status: 200, body: "" } }, { query: { "go": 1 } });
            await waitForCollectDone();
        } catch (e) { console.log(e); }
    });
})

async function waitForCollectDone() {
    let p = new Promise((resolve, reject) => {
        let count = 0;
        let timer = setInterval(async () => {
            let context = { res: { status: 200, body: "" } };
            let r = await collectApi(context, { query: {} });
            if (r.status == "Done") {
                clearInterval(timer);
                resolve();
            }
            process.stdout.write(".");
            if (count++ > 300) {
                clearInterval(timer);
                reject("Collect timed out")
            }
        }, 1000);
    })
    return await p;
}
