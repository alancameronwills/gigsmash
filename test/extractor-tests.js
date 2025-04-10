const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs/promises');

const code = require('..\\api\\events\\index.js');

async function extract(venue) {
    let context = {
        res: {
            body: "", status: 200,
            headers: { "Content-Type": "text/plain" }
        },
        log: console.log
    };
    let req = { query: { venue : venue } };
    await code(context, req);
    return context;
}

function isString (value) {
    return typeof value === 'string' || value instanceof String;
} 

test('extractor tests', async (t) => {
    await t.test('extractor list', async (t) => {
            let r = await extract("");
            let promoters = JSON.parse(r.res.body);
            let list = Object.keys(promoters);
            assert(list.length > 10 && list.length < 200);
            assert(list.every(item => isString(item)));
            assert(list.every(k => isString(promoters[k])));
        });
    await t.test('all extractors', async(t) => {
        let r = await extract("");
        let promoters = JSON.parse(r.res.body);
        let list = Object.keys(promoters);
        await Promise.all(list.map(venue=>
            t.test(venue, async(t) => {
                let rr = await extract(venue);
                //console.log(rr);
                let items = JSON.parse(rr.res.body);
                assert(items.length > 0, "Got no items");
                items.forEach(x => {
                    assert(x.title, `[no title] ${x.url} ${x.date}`);
                    assert(x.image, `[no image] ${x.title} ${x.date}`);
                    assert(x.url, `[no url] ${x.title} ${x.date}`);
                    assert(x.dt, `[no date] ${x.title} ${x.date}`);
                });
            } )));
    })
    
})