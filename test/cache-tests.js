const test = require('node:test');
const assert = require('node:assert');

const fsp = require('fs/promises');

const { Cache } = require("../api/SharedCode/cachepic.js");
const { FileStorer } = require("../api/SharedCode/filestorer.js");
const testFolder = "client/testpix/";
const fs = FileStorer(testFolder);

const samples = [
    "https://neverncastle.wales/wp-content/uploads/2022/02/bailey-s-edited-600x337.jpg",
    "https://neverncastle.wales/wp-content/uploads/2021/03/26-Nevern-Castle-in-1191-Square-Tower-cutaway-s-858x1024.jpg",
    "https://d235gwso45fsgz.cloudfront.net/as-assets/variants/r57h3phildqb6swvamtb67qhmanm/7790667b1499641e0a482fd470ef3a3eb0b7d17469237a4cb9f28a097afaa2aa",
    "https://www.stdavidscathedral.org.uk/sites/default/files/styles/full_width/public/images/music-bells1_0.jpg?itok=xqFdYScd"
]

test('cache', async (t) => {
    await t.test('cache samples', async (t) => {
        
        await fs.purge();
        const cache = Cache();

        await Promise.all(samples.map(src =>
            t.test(src, async (t) => {
                let {name, e, wasCached} = await cache.getCache(src, false);
                assert (name, `Empty hashed name ${src}`);
                assert (!e, `Not converted ` + e);
                assert (name != src, `Unconverted ${src}`);
                assert (name.match(/^[0-9]+(\.[^.\/?#]*)?/), `Bad hashname [${name}] ${src}`);
                let stat = await fsp.stat(testFolder + name);
                assert (stat.size > 500, `Small or no cache file [${name}] ${src}`);
                assert (!wasCached, "Says it got it from the cache??");
            })));
        await Promise.all(samples.map(src =>
            t.test(src, async (t) => {
                let {name, e, wasCached} = await cache.getCache(src, false);
                assert (wasCached, `Didn't get it from the cache ${name}`);
            })))
    });
})
