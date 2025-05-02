
const http = require('http');
const util = require('util');
const fs = require('fs/promises');
const fsSync = require('fs');
const process = require('process');

const logverbose = false;


var server = null;


const handlers = {
	ping: (request, response) => {
		response.body = "pong " + new Date().toISOString();
	},
	stopserver: (request, response) => {
		setTimeout (() => server.close(), 1000);
		response.body = "Stopped " + new Date().toISOString();
	}
};

async function runFile(fPath, req, response) {
	let context = { res:response , log:console.log};
	try {
		let code = (await import(fPath)).default;
		context.res.body = `Code5 ${util.inspect( code)} ${fPath}`;
		await code (context, req);
	} catch (e) {
	    context.res.body = `runFile ${fPath} error ${e.toString()}`;
	}
	response.body = context.res.body;
	response.status = context.res.status;
	response.headers = context.res.headers;
	return response;
}



function parseReq(request, defaultPage = "/index.html") {
	let url = request.url.toLowerCase();
	let method = request.method;
	let headers = {};
	for (let i = 0; i < request.rawHeaders.length; i += 2) {
		headers[request.rawHeaders[i]] = request.rawHeaders[i + 1];
	}
	let host = headers.Host;
	let path = url.replace(/[\?#].*/, "");
	let path2 = path.replace(/^\/[^\/]*/,"");
	if (path == "/") path = defaultPage;
	let extension = path.match(/\.[^.]*$/)?.[0] ?? "";
	let queryString = url.match(/\?(.*)/)?.[1] ?? "";  // url.replace(/.*\?/,"");
	let paramStrings = queryString.split('&');
	let query = paramStrings.reduce((m, keqv) => {
		if (!keqv) return m;
		let kv = keqv.split('=');
		m[kv[0]] = kv.length > 1 ? kv[1] : true;
		return m;
	}, {});
	return { path: path, path2, extension: extension, queryString: queryString, query: query, host: host, url: url, method: method, headers: headers };
}
(async () => {
var root = (await fs.realpath('.')).replace("/server", "");
var count = 0;

server = http.createServer(async function(request, res) {
    var message = "", version = "";
    var response = {status:200,headers:{'Content-Type': 'text/plain'},body:"Nothing"};
    try {
		let req = parseReq(request);
		let cmd = req.path2.substring(1);
		//response.body = `Cmd [${cmd}]`;
		let h = handlers[cmd];
		
		
		if (h) {
    		//response.body = `Immediate handler [${cmd}]`;
			h(request, response);
		} else {
		    let fPath = `${root}/api${req.path2}`;
		    //response.body = `fPath [${fPath}]`;
			if (fPath.indexOf("..") < 0 && fsSync.existsSync(fPath)) {
				if (fsSync.lstatSync(fPath).isDirectory()) {
					fPath += "/index.js";
			    }
		        //response.body = `running [${fPath}]`;
				
			    await runFile(fPath, req, response);	
		 
		    } else {
                message = `It works! ${count++} \n` ;
                let q = JSON.stringify(req, null, "  ");
                version = 'NodeJS ' + process.versions.node + '\n';
                response.body = [message, q, root, version].join('\n');
		    }
			    
		}
    } catch (e) {
        response.body = "Error: " + e.toString();
    }
    res.writeHead(response.status, response.headers);
    res.end(response.body);
});
server.listen();
})();
