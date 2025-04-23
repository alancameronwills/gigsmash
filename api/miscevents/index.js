const fs = require('fs/promises');
module.exports = async function (context, req) {
    const saveFile = "data/miscevents.json";
    let status = 200;
    let responseMessage = "";
    try {
        await fs.mkdir("data", {recursive:true});
        if (req.method=="GET") {
            responseMessage += await fs.readFile(saveFile);
        } else {
            if (req.body) {
                await fs.writeFile(saveFile, req.rawBody, {flush:true});
            }
        }
    } catch (e) {
        responseMessage += "Caught: " + e.toString();
        status = 400;
    }

    context.res = {
        status: status, 
        body: responseMessage
    };
}