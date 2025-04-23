const { Cache, FileStorer } = require("../SharedCode/localpic.js");

/**
 * Get a picture from a given URL
 * Compress and cache it
 * @param {*} context .res.status = result of getting source, .res.body.cache = cache ID
 * @param {*} req query.src - the requested source URL or cache ID
 */

module.exports = async function (context, req) {
    context.log(`Gigpic req for ${req.query.src}`);
    const cache = Cache(FileStorer());
    try {
        let { pic, name } = await cache.getCache(req.query.src);
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: pic
        };
    } catch (e) {
        console.log(e);
        context.res = {
            status: 400,
            body: "not found"
        }
    }
}
