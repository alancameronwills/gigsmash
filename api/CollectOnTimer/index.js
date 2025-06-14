const collector = require("../collect/index.js");

module.exports = async function (context, myTimer) {

    try {
    
        collector(context, {query:{go:1}});
        console.log("Done timed collect");
      
    }
    catch (e) {
        context.log(e.stack);
    }
    context.log("Ended timed collect");
};