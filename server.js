const http = require('http');
const util = require('util');
const fs = require('fs/promises');
const { argv } = require('process');
const parse = require('html-dom-parser').default;
let cacheDir = "cache";
let logFile="log.log";

const logverbose = true;

const contentTypes = {
	".css": "text/css",
	".htm": "text/html", ".html": "text/html",
	".gif": "image/gif",
	".jpg": "image/jpeg", ".jpeg": "image/jpeg",
	".js": "text/js",
	".json": "application/json",
	".mp3": "audio/mpeg", ".mp4": "video/mp4", ".mpeg": "video/mpeg",
	".png": "image/png",
	".pdf": "application/pdf",
	".txt": "text/plain"
};

(async () => {
	let root = (await fs.realpath('.')).replace("/server", "");
	//let log = `${root}/${logFile}`;
	const clientRoot = `${root}`;
	log("Client root: " + clientRoot);

	const handlers = {
		"get-url": getUrl,
		
		"ping": async () => { return { body: 'pong ' + (new Date().toISOString()), status: 200, contentType: "text/plain" } },
		"config": async () => {
			let configFilter = ["churchName", "offline", "location", "buttonPosition", "qrPosition", "plea", "calendarWords", "strings", "update"];
			let config = configFilter.reduce((o, v) => { o[v] = credentials[v] || ""; return o; }, {});
			if (argv?.[4]) config.location += argv[4];
			return {
				body: JSON.stringify(config),
				status: 200,
				contentType: "application/json"
			}
		}
	};
    handlers["moylgrove"] = async() => {
        let mgResponse = await getUrl({u:"moylgrove.wales/events"});
        let ul = mgResponse.body.match(/<ul[^>]*eventList.*?<\/ul>/s)?.[0] || "";
        let ulParsed = parse(ul);
        //return {body:util.inspect(ulParsed, true, 9), status:200, contentType:"application/json"};
        //return {body:JSON.stringify(mgEvents(ulParsed), ["url", "c", "src", "srcset","children","name","attribs","class","type","data","data-url"], "  "), status:200, contentType:"application/json"};
        return {body:JSON.stringify(mgEvents(ulParsed)),status:200, contentType:"application/json"};
    }
    function mgEvents(ulParsed) {
        let li = ulParsed[0].children.filter(item => item?.children);
        let items = li.map((x)=> mgEvent(x));
        return items;
    }

    function mgEvent(x) {
        let r = {venue:"Moylgrove"};
        r.url = x.attribs["data-url"];
        x.children.forEach(c => {
            if (c?.name == "img") {
                r.image = c.attribs.src;
            }
            if (c.attribs?.class=="eventContent") {
                c.children.forEach(cc => {
                    if (cc.attribs?.class=="eventTitle") {
                        r.title = cc.children[0]?.data;
                    }
                    if (cc.attribs?.class == "subtitle") {
                        r.subtitle = cc.children[0]?.data;
                    }
                    
                    if (cc.attribs?.class == "where") {
                        r.venue = cc.children[0]?.data;
                    }
                    if (cc.attribs?.class == "eventDate") {
                        let ds = cc.children[0]?.data;
                        let dsm = ds.match(/^.*?:[0-9][0-9]/)[0].replace(/th|nd|st/,'');
                        let date = new Date(dsm);
                        r.date = date.toISOString().substring(0,16);
                        r.dt = date.valueOf();
                    }
                    if (cc.attribs?.class == "eventPrice") {
                        r.price = cc.children[0]?.data;
                    }
                    if (cc.attribs?.class == "eventDescription") {
                        let text = [];
                        cc.children[0].children.forEach (ccc => {
                            if (ccc.type == "text") {
                                text.push(ccc.data);
                            }
                        });
                        r.text = text.join("<br/>\n");
                    }
                });
            }
        });
        return r;
    }

    handlers["rhosygilwen"] = async() => { 
        let date = new Date().toISOString().substring(0,10);
        let response = await getUrl({u:`rhosygilwen.co.uk/wp-admin/admin-ajax.php?action=mec_grid_load_more&atts[sk-options][grid][limit]=100`});
        let responseObject = JSON.parse(response.body);
        log("Items " + responseObject.count);
        let chunks = responseObject.html.match(/<article.*?<\/article>|<script.*?<\/script>/gs);
        let r = [];
        chunks.forEach(v => {
            if (v.indexOf("<script")==0) {
                let jsonMatch = v.match(/\{.*\}/s)[0];
                let jso = JSON.parse(jsonMatch);
                r.push({"date":jso.startDate,
                    dt: new Date(jso.startDate).valueOf(),
                    venue: "Rhosygilwen",
                    price:jso.offers?.price,
                    "image":jso.image,
                    "title" : jso.name,
                    url:jso.url,
                    "text":jso.description
                });
            }
        });
        let b = JSON.stringify(r);
        //let b = JSON.stringify(items, ["url", "c", "src", "srcset","children","name","attribs","class","type","data","data-url", "script"], "  ");
        return {body:b,status:200,contentType:"application/json"};
    }

    handlers["span"] = async() => {
        let response = await getUrl({u:"span-arts.ticketsolve.com/shows.xml"});
        let venues = response.body.split("</venue>");
        log ("Venues " + venues.length);
        let r = [];
        venues.forEach(v=>{
            let venueNameElement = v.match(/<name>.*?<\/name>/s);
            if (venueNameElement) {
                let venueName = venueNameElement[0].match(/<!\[CDATA\[(.*?)\]\]/s)?.[1] || "";
                let shows = v.match(/<show .*?<\/show>/sg);
                log("Shows " + shows.length  + venueName);
                shows.forEach(s => {
                    let showNameElement = s.match(/<name>.*?<\/name>/s);
                    if (showNameElement) {
                        let showName = showNameElement[0].match(/<!\[CDATA\[(.*?)\]\]/s)?.[1] || "";
                        let description = s.match(/<description>(.*?)<\/description>/s)?.[1] || "";
                        let images = s.match(/<images>(.*)<\/images>/s)?.[1] || "";
                        let imageUrl = images?.match(/(https:[^<]*)/s)?.[1] || "";
                        let eventSection = s.match(/<events>(.*?)<\/events>/s)?.[1] || "";
                        let events = eventSection.split("</event>");
                        events.forEach(e => {
                            let date = e.match(/<date_.*?>(.*?)</s)?.[1] || "";
                            if (date) {
                                let url = e.match(/<url>(.*?)<\/url>/s)?.[1] || "";
                                r.push ({
                                    venue : venueName,
                                    date: date,
                                    dt: new Date(date).valueOf(),
                                    image: imageUrl,
                                    title: showName,
                                    url: url,
                                    text: description.match(/<!\[CDATA\[(.*?)\]\]/s)?.[1] || ""
                                });
                            }
                        })
                    }
                })
                //log (`Venue ${venueName} ${shows.length}`);    
            }
        })
        //return {body:response.body, status: 200, contentType:"text/plain"};
        return {body:JSON.stringify(r), status: 200, contentType:"application/json"};
    }
    
	function serve(request, response) {
		try {
			let req = parseReq(request);
			let contentType = contentTypes[req.extension] ?? "";
			req.path = req.path.replace("\/card-machine\/", "/");
			req.contentType = contentType;

			if (!contentType) {
				let recognized = false;
				for (let k of Object.keys(handlers)) {
					if (req.path.indexOf("/" + k) == 0) {
						(async () => {
							try {
								let reply = await handlers[k](req.params, clientRoot);
								response.writeHead(reply.status, { "Content-Type": reply.contentType });
								response.end(reply.body);
							} catch (err) {
								log("Handler exception: " + util.inspect(err));
							}
						})()
						recognized = true;
					}
				}
				if (!recognized) {
					response.writeHead("404", "text/plain");
					response.end("Not found: " + req.path);
				}
			} else {
				let reply = util.inspect(req);
				let replyType = "application/json";
				if (req.path.indexOf("..") < 0) {
					if (req.path.indexOf(".html") > 0) log("File: " + req.path);
					(async () => {
						try {
							reply = await fs.readFile(clientRoot + req.path);
							replyType = contentType;
						} catch (err) {
							req.err = err;
							reply = util.inspect(req);
						} finally {
							response.writeHead(200, { "Content-Type": replyType });
							response.end(reply);
						}
					})()
				}
			}
		} catch (err) {
			log("Serve exception " + util.inspect(err));
		}
	}

	const server = http.createServer(serve);
	const port = process.argv[2] || 80;
	server.listen(port);
	log(`Server running at http://localhost:${port}`);
})()


async function sleepForSeconds(seconds) {
	return new Promise((resolve) =>setTimeout(resolve, seconds * 1000));
}

async function listSlides(params, credentials, clientRoot) {
	let imgdir = await fs.readdir(`${clientRoot}/img`, { withFileTypes: true });
	let slidesDir = "";
	for (let item of imgdir) {
		if (item.isDirectory && item.name.startsWith("slides")) {
			if (item.name.indexOf("!") < 0 || !credentials?.location
				|| item.name.indexOf(credentials.location) >= 0) {
				slidesDir = item.name;
				break;
			}
		}
	}
	let dir = await fs.readdir(`${clientRoot}/img/${slidesDir}`);
	let urlDir = dir.map(d => `/img/${slidesDir}/${d}`);
	return { body: JSON.stringify(urlDir), contentType: "application/json", status: 200 };
}



async function getUrl(params) {
	let url = "https://" + params["u"];
	verbose("Get url: " + url);
	try {
		let response = await fetch(url, params["o"]);
		replyType = response.headers.get("content-type");
		verbose(response.status);
		verbose(util.inspect(response.headers));
		verbose("Content-Type: " + replyType);
		let reply = await response.text();
		return {
			status: response.status,
			contentType: response.headers.get("content-type"),
			body: reply
		}
	} catch (err) {
		log("Error: " + util.inspect(err));
		return { status: 500, contentType: "text/plain", body: util.inspect(err) };
	}
}


function parseReq(request, defaultPage = "/index.html") {
	let url = request.url;
	let method = request.method;
	let headers = {};
	for (let i = 0; i < request.rawHeaders.length; i += 2) {
		headers[request.rawHeaders[i]] = request.rawHeaders[i + 1];
	}
	let host = headers.Host;
	let path = url.replace(/[\?#].*/, "");
	if (path == "/") path = defaultPage;
	let extension = path.match(/\.[^.]*$/)?.[0] ?? "";
	let query = url.match(/\?(.*)/)?.[1] ?? "";  // url.replace(/.*\?/,"");
	let paramStrings = query.split('&');
	let params = paramStrings.reduce((m, keqv) => {
		if (!keqv) return m;
		let kv = keqv.split('=');
		m[kv[0]] = kv.length > 1 ? kv[1] : true;
		return m;
	}, {});
	return { path: path, extension: extension, query: query, params: params, host: host, url: url, method: method, headers: headers };
}


function verbose(msg) {
	if (logverbose) log(msg);
}
let previousMsg = "";
let messageRepeatCount = 0;
function log(msg, condition = true) {
	if (condition && previousMsg != msg) {
		if (messageRepeatCount>0) {
			console.log(` * ${messageRepeatCount}`);
			messageRepeatCount = 0;
		}
		previousMsg = msg;
		console.log(`${new Date().toISOString()} ${msg}`);
	} else {
		messageRepeatCount++;
	}
}


