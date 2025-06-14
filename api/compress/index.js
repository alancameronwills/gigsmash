const {storeThumbnail,containerName} = require("../SharedCode/compresspix.js");

module.exports = async function (context, req) {    
    const url = req.query.url || "https://moylgrove.wales/wp-content/uploads/2021/10/hall-ext-sq-300x300.jpg";
    const result = await storeThumbnail(url);
    context.res = {
        status: result.error ? 400 : 200,
        body: result.error ? "Failed " + result.error : `OK ${result.name} https://pantywylan.blob.core.windows.net/${containerName}/${result.name}` 
    };
}
