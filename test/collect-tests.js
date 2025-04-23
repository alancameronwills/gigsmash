const test = require('node:test');
const assert = require('node:assert');

const fsp = require('fs/promises');

const collectApi = require("../api/collect/index.js");
const {collectLock} = collectApi.test;


test('collect', async (t) => {
    await t.test('lock', async (t) => {
        const tp = ".lock-test"
        await fsp.rm(tp, {force:true});
        assert(!collectLock(false, 42, tp), "0. Failed to clear lock 42");
        assert(collectLock(true, 42, tp), "1. Failed to set lock 42");
        assert(!collectLock(true, 43, tp), "2. Erroneously set lock 43");
        assert(!collectLock(false, 42, tp), "3. Failed to clear lock 42");
        assert(collectLock(true, 43, tp), "4. Failed to set lock 43");
        assert(!collectLock(true, 42, tp), "5. Erroneously set lock 42");
        assert(!collectLock(false, 43, tp), "6. Failed to clear lock 43");
    })
})