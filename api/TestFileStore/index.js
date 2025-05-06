const events = require("../events/index.js");
const { FileStorer } = require("../SharedCode/filestorer.js"); // await cache.getCache(req.query.src);
const { Cache } = require("../SharedCode/cachepic.js"); // await cache.getCache(req.query.src);
const fs = require('fs'); // synchronous
const { pid } = require('node:process');


module.exports = async function (context, req) {
    let responseMessage = "";
    let logger = {log:(m)=>responseMessage+=m+"\n"}
    try {
        responseMessage += "FileStore and Cache\n";
        
        const blobStore = FileStorer("client/pix");
        const cache = Cache(blobStore, 300, logger);
        context.log('Start ');

        responseMessage += `Events ${typeof events}
            fs ${typeof fs}
            pid ${pid}
            cache ${typeof cache}
            `;

    
        const name = req.query.url || "https://moylgrove.wales/wp-content/uploads/2021/10/hall-6-1.png";
        //responseMessage += blobStore.t();
        responseMessage += `Before purge has ${await (blobStore.has('5'))}\n`;
        await blobStore.purge();
        responseMessage += `After purge has ${await (blobStore.has('5'))}\n`;

        const cacheInfo = await cache.getCache(name);

        responseMessage += `T ${await (blobStore.has(cacheInfo.name))}  B ${cacheInfo.name} wasCached=${cacheInfo.wasCached}\n`;

        responseMessage += "\nCollect\n";
        


    } catch (e) {
        responseMessage += "\nError " + e.stack;
    }
    context.res = {
        status: 200, /* Defaults to 200 */
        body: responseMessage
    };
}