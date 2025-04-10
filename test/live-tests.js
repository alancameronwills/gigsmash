const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs/promises');

const serverUrl = "https://pantywylan-2.azurewebsites.net";

async function getEvents(venue) {
    return await fetch(`${serverUrl}/api/events?venue=${venue}&x=${Date.now()}`).then(r => r.json());
}

function isString (value) {
    return typeof value === 'string' || value instanceof String;
} 

test("live", async t => {
    await t.test("get venues", async t => {
        let promoters = await getEvents("");
        let list = Object.keys(promoters);
        assert(list.length > 10 && list.length < 200, "Venue list length: " + list.length);
        assert(list.every(item => isString(item)));
    });
    await t.test("venues", async t => {
        let promoters = await getEvents("");
        let list = Object.keys(promoters);
        assert(list.length > 0);
        await Promise.all(list.map(venue =>
            t.test(venue, async (t) => {
                let items = await getEvents(venue);
                assert(items.length > 0, "Got no items");
                items.forEach(x => {
                    assert(x.url && x.dt, (x.url || "[no url] ") + (x.dt || " [No date] ") + x.date);
                });
            })));
    });
})