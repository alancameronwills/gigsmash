
function attr(s, cls) {
    return s.match(new RegExp(`<div[^>]+class=['"]${cls}['"].*?>(.*?)</div>`, "s"))?.[1]?.replace(/<div.*?>/, "") || "";
}

function m(source, reg, ix = 1) {
    return (source?.match(reg)?.[ix] || "").trim();
}

function datex(dateString) {
    return dateString.trim().replace(/^[A-Z][a-z]+ +/, "").replace(/st|nd|rd|th/, "").replace(/\s+/sg, " ").trim();
}

async function ftext(url, sendHeaders = false) {
    let headers = !sendHeaders ? null : {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Priority": "u=0,i",
        "Sec-Ch-Ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": "Windows",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": 1,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    }
    return await fetch(url, headers).then(r => r.text()).catch(e => "");
}

let handlers = [];

handlers["folkfest"] = async () => {
    let events = ["23 May 2025", "24 May 2025", "25 May 2025", "26 May 2025"].map(date => {
        return {
            title: "Fishguard Folk Festival",
            text: "Mainly free acts, walks, workshops, sessions",
            image: "https://static.wixstatic.com/media/94faf9_c433f6cd36dc41c0970e2ef0a3be1b0f~mv2.png",
            url: "https://www.fishfolkfest.co.uk/",
            venue: "Fishguard",
            date: date,
            category: "live",
            dt: new Date(date).valueOf()
        };
    });
    events.push({
        title: "Ríoghnach Connolly with/gydaf John Ellis",
        text: "Fishguard Folk Festival presents Ríoghnach Connolly RTE 1 folk Singer of the Year 2025 (Ireland). BBC Radio 2 Folk Singer of the Year 2017.",
        image: "https://static.wixstatic.com/media/2943ab_19dea7936d2a4e9394ba9af872356873~mv2.jpeg/v1/crop/x_0,y_0,w_858,h_857/fill/w_402,h_402,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/rioghnach2.jpeg",
        url: "https://www.eventbrite.com/e/rioghnach-connolly-withgydaf-john-ellis-support-tickets-1094500443289?aff=ebdsshios",
        venue: "Capel Bethel, Fishguard",
        date: "Friday 23 May 2025 7:30pm",
        dt: new Date("2025-05-23 19:30").valueOf()
    });
    return events;
}

handlers["othervoices"] = async () => {
    let events = ["30 October 2025", "31 October 2025", "1 November 2025"].map(date => {
        return {
            title: "Other Voices",
            text: "Fills the town with incredible music and inspiring conversations. Buy tickets now for the Music Trail.",
            image: "https://cdn.prod.website-files.com/6086b948a54f081798acf981/6086bcfc0897470cb2ea3bfb_OV-logo.png",
            url: "https://www.othervoices.ie/events/other-voices-cardigan-2025",
            venue: "Aberteifi",
            date: date,
            category: "live",
            dt: new Date(date).valueOf()
        };
    });
    return events;
}

handlers["bluestone"] = async () => {
    try {
        let source = await ftext("https://www.bluestonebrewing.co.uk/collections/events/", true);
        let products = source.match(/<product-card.*?<\/product-card>/gs) || [];
        return products.map(product => {
            let title = m(product, /<product-card-title>(.*?)</s);
            let dateString = datex(m(product, /<p>(.*?)<\/p>/s));
            return {
                image: m(product, /<img[^>]*src="(.*?)"/s),
                title: title,
                url: "https://www.bluestonebrewing.co.uk" + m(product, /href="(.*?)"/s),
                venue: "Bluestone Brewery",
                category: title.toLowerCase().indexOf("quiz") < 0 ? "live" : "quiz",
                text: "",
                date: dateString,
                dt: new Date(dateString.replace(/at.*/, "")).valueOf()
            }
        });
    } catch (e) { return { e: e.toString() } }
}


handlers["ffm"] = async () => {
    let r = [];
    try {
        let source = await ftext("https://www.fishguardmusicfestival.com/programme2025");
        let divs = source.match(/<div[^>]*>([^<]|<(?!div))*?<\/div>/sg);
        let columnStrings = divs.filter(d => (d.match(/<\/p>/g)?.length || 0) > 10);
        let columns = columnStrings.map(cs => cs.match(/.*?(<br[^>]*>|<\/p>)/gs));
        let dates = columns[0].map(c0 => c0.replace(/<.*?>/gs, "").trim());
        let shows = columns[1].map(c1 => c1.replace(/<.*?>/gs, "").trim());
        let urls = columns[2].map(c2 => m(c2, /href="(.*?)"/).trim());
        let venues = columns[3].map(c3 => c3.replace(/<.*?>/gs, "").trim());
        for (let i = 0; i < dates.length; i++) {
            let d = dates[i] + " 2025";  // <<<<<<< YEAR
            let ri = {
                title: shows[i],
                venue: venues[i],
                text: "",
                url: urls[i],
                image: "https://cdn.ticketsource.com/images/promoter/banner/03531-17138624187415-s.png",
                date: d,
                dt: new Date(d).valueOf() || 0,
                category: "live"
            };
            r.push(ri);
        }
    } catch (e) { r.push({ e: e.toString() }); }
    return r;
}

handlers["queens"] = async () => {
    let r = [];
    try {
        let root = "https://thequeenshall.org.uk";
        let source = await ftext(root + "/whats-on/live-events");
        let eventSection = m(source, /<div class="main-area.*?>(.*)/s).replace(/<div class="noPrint/, "");
        let events = eventSection.match(/<article.*?>.*?<\/article>/gs);
        events.forEach(event => {
            let ri = {};
            ri.url = m(event, /href="(.*?)"/);
            ri.image = m(event, /src="(.*?)"/);
            ri.title = m(event, /<[^>]+event-title.*?>(.*?)</s);
            ri.date = m(event, /<[^>]+event-date.*?>(.*?)</s);
            ri.dt = new Date(ri.date.replace(",", "")).valueOf() || 0;
            ri.text = "";
            ri.venue = "Queens Hall Narberth";
            ri.category = (event.match(/<[^>]+badge-event.*?>.*?</gs)?.map(b => m(b, />(.*)</s))?.join(", ") || "").toLowerCase();
            r.push(ri);
        })

    } catch (e) { return { e: e.toString() }; }
    return r;
}

handlers["cellar"] = async () => {
    let r = [];

    try {
        let root = "https://thecellarcardigan.bandcamp.com";
        let source = await ftext(root + "/merch");

        let eventList = m(source, /<ol [^>]*id="merch-grid".*?>(.*?)<\/ol>/s);

        let events = eventList.match(/<li.*?>(.*?)<\/li>/sg);

        events.forEach(event => {
            let ri = {};
            ri.url = root + m(event, /href="(.*?)"/s);
            ri.image = m(event, /<img.*?data-original="(.*?)"/) || m(event, /<img.*?src="(.*?)"/);
            let titleLine = m(event, /<p class="title">(.*?)<\/p>/s);
            if (!titleLine.match(/20[23][0-9]$/)) { titleLine += " 2025"; } // <<<< YEAR
            ri.title = (m(titleLine, /^(.*)[-<]/s) || m(titleLine, /^(.*?)[A-Z][a-z]+day/s) || titleLine).trim();
            ri.date = (m(titleLine, /-([^-]*)$/s) || m(titleLine, /([A-Z][a-z]+day\s.*)$/s)).trim();
            ri.dt = new Date(datex(ri.date))?.valueOf() || 0;
            ri.venue = "Cellar Cardigan";
            ri.text = "";
            ri.price = m(event, /<span class="price">(.*?)<\/span>/s);
            if (!ri.dt) {
                // try harder - might be a date range
                let day = m(titleLine, /([0-9]{1,2})[^0-9]/);
                let monthYear = m(titleLine, /( [A-Za-z]+ 202[5-9])/);
                ri.date = day + " " + monthYear;
                ri.dt = new Date(datex(ri.date))?.valueOf() || 0;
            }
            ri.category = "live";
            r.push(ri);
        })

    } catch (e) {
        r.push({ e: e.toString() });
    }

    return r;
}

handlers["aberjazz"] = async () => {
    let source = await ftext("https://aberjazz.com/en/html/Tickets.html");
    let eventList = m(source, /class="main".*?<\/table>.*?<table .*?>(.*?)<\/table>/s);
    let rows = eventList.match(/<tr>(.*?)<\/tr>/sg);
    let cyear = new Date().getFullYear();
    let cdate = 0;
    let dateString = "";
    let skip = false;
    let r = [];
    // r.push({source: source?.length || "--", eventList: eventList?.length || "--", rows: rows?.length || "--"});
    try {
        rows?.forEach(row => {
            let ri = {};
            if (skip) { skip = false; }
            else {
                //r.push({row:row});
                if (row.match(/class="table-head/)) {

                    let rowContent = m(row, /<td.*?>(.*?)<\/td>/s);
                    dateString = m(rowContent, />([0-9a-zA-Z .]+)</);
                    let dateWithYear = datex(dateString) + " " + cyear;
                    let date = new Date(dateWithYear);
                    cdate = date.valueOf();
                    if (!cdate) dateString += " ~" + dateWithYear + "~";
                    skip = true;
                    //r.push ({cdate:cdate});

                } else {

                    let columns = row.match(/<td.*?>.*?<\/td>/gs);
                    //r.push({columns: columns.length});
                    if (columns && columns.length > 1) {
                        ri.title = columns?.[0]?.replace(/<.*?>/sg, "")?.trim() || "AberJazz";
                        ri.venue = columns?.[1]?.replace(/<.*?>/sg, "")?.trim() || "";;
                        ri.url = m(columns?.[0], /href=['"](.*?)['"]/s);
                        ri.text = "";
                        ri.dt = cdate;
                        ri.date = dateString;
                        ri.category = "live";
                        ri.image = "https://www.tregroes.co.uk/wp-content/uploads/2018/02/aberjazz-thumb.jpg";
                        r.push(ri);
                    }
                }
            }

        });
    } catch (e) { r.push({ e: e }); }
    return r;
}

handlers["smallworld"] = async () => {
    let source = await ftext("https://www.smallworld.org.uk/events");
    let showlist = m(source, /<div class=[^>]*eventlist--upcoming.*?>(.*?)<\/article>\s*<\/div>/s);
    let shows = showlist.split(/<article/);
    let r = [];
    shows.forEach(show => {
        let ri = {};
        ri.image = m(show, /src=['"](.*?)['"]/s);
        ri.url = "https://www.smallworld.org.uk" + m(show, /href=['"](.*?)['"]/s);
        ri.title = m(show, /<h1.*?>(.*?)<\/h1>/s).replace(/<.*?>/s, "");
        ri.venue = "SmallWorld";
        ri.text = "";
        //ri.date = m(show, /event-time[^>]+datetime=['"](.*?)['"](?:>[0-9:]+)?)/s).replace(/['"]>/, " ");
        ri.date = m(show, /event-time[^>]+datetime=['"](.*?['"](?:>[0-9:]+)?)/s).replace(/['"]>/, " ");
        //ri.date = m(show, /datetime=['"](.*?)['"]/s);
        ri.dt = new Date(ri.date).valueOf();
        ri.category = "live";
        if (ri.dt) {
            r.push(ri);
        }
    })
    return r;
}

handlers["gwaun"] = async (x) => {
    let fromSavoy = [], fromGwaun = [];
    {
        let r = [];
        let source = await ftext("https://theatrgwaun.savoysystems.co.uk/TheatrGwaun.dll/");

        let shows = source.split(/<div class=['"][^"']*programme.*?>/s);
        shows.forEach(show => {
            let h1 = m(show, /<\s*([^\s>]+)\s[^>]*class=".*?title.*?".*?>(.*?)<\/\1>/s, 2);
            let url = m(h1, /href=['"](.*?)['"]/s);
            let title = m(h1, />(.*?)</);
            let image = m(show, /<img\s+src=['"](.*?)['"]/s);
            let dateList = [...show.matchAll(/PeformanceListDate.*?>(.*?)</sg)];
            let dateSet = [];
            if (dateList && dateList.length > 0) {
                let previous = "";
                dateList.forEach(d => {
                    if (d?.[1] && d[1] != previous) {
                        dateSet.push(d[1]);
                        previous = d[1];
                    }
                })
            }
            dateSet.forEach(d => {
                let dt = new Date(d).valueOf();
                if (dt) {
                    let ri = {
                        date: d,
                        dt: dt,
                        url: url,
                        urlset: show.match(/href="(.*?)"/g).map(href=>m(href, /"(.*?)"/s)),
                        title: title,
                        image: image,
                        text: "",
                        venue: "Theatr Gwaun"
                    };
                    r.push(ri);
                }
            })
        })
        fromSavoy = r;
    }

    {
        let sectionCategories = { "ntl-and-roh-screening": "broadcast", "events": "live", "theatre": "live", "cinema": "film" };
        let sectionEvents = [];
        const menus = [];
        await Promise.all(Object.keys(sectionCategories).map(async section => {
            let source = await ftext(`https://theatrgwaun.com/${section}/`);
            let r = [];
            let eventSources = source.split(/"wp_theatre_event"/);
            //console.log(`Section ${section} events ${eventSources.length}`);
            try {
                eventSources.forEach(eventSource => {
                    let ri = {};
                    ri.category = sectionCategories[section];
                    ri.venue = "Theatr GWaun";
                    ri.image = m(eventSource, /<img[^>]*src="(.*?)"/s);
                    ri.title = m(eventSource, /"wp_theatre_event_title".*?>(.*?)<\/div>/s).replace(/<.*?>/gs, "");
                    ri.url = m(eventSource, /"wp_theatre_event_tickets".*?href="(.*?)"/s);
                    ri.text = m(eventSource, /"wpt_production_categories".*?>(.*?)<\/ul>/s).replace(/<.*?>/g, "");
                    ri.date = m(eventSource, /"wp_theatre_event_datetime".*?>((?:<div.*?>.*?<\/div>\s*)+)<\/div>/s)?.
                        replace(/<.*?>/g, " ")?.trim() || "";
                    ri.dt = new Date(ri.date).valueOf();
                    if (ri.url) {
                        r.push(ri);
                    }
                })
                //console.log(`   Section ${section} got ${r.length}`);
                sectionEvents.push(r);
            } catch (e) { console.log(e.toString()) }
        }));
        fromGwaun = sectionEvents.flat();
        //console.log(`fromGwaun ${fromGwaun.length}`);
    }
    //console.log(`fromSavoy ${fromSavoy.length}`);
    {
        try {
            let notFound = [];
            let byUrl = {};
            fromGwaun.forEach(ev => {byUrl[ev.url.trim()] = ev;});
            fromSavoy.forEach(ev => {
                let found = false;
                ev.urlset?.forEach(u => {
                    let gwaunEvent = byUrl[u.trim()];
                    if (gwaunEvent) {
                        ev.category = gwaunEvent.category;
                        gwaunEvent.used = true;
                        found = true;
                    }
                })
                if (!found) notFound.push(ev);
            })
            //console.log("Unused: " + Object.keys(byUrl).map(k => byUrl[k]).filter(ev => !ev.used).map(ev=>ev.title).join('\n   '));
            //console.log("Not found: " + notFound.map(ev=>ev.title).join("\n  "));
        } catch (e) { console.log(e.toString()) }
    }
    return x ? fromGwaun : fromSavoy;
}

handlers["mwldan"] = async () => {
    let source = await ftext("https://mwldan.co.uk/whatson/all");
    let tail = source.split(/whats-on-all[^>]*/)?.[1] || "";
    let shows = tail.split(/<div[^>]*node-show.*?>/);
    let r = [];
    // Infer year - they only show day and month
    let today = new Date();
    let cyear = today.getFullYear();
    let cmonth = today.getMonth();
    shows.forEach(show => {
        let ri = {};
        ri.image = m(show, /<img .*?src=['"](.*?)['"]/s);

        let showMatch = show.match(/<div class="content".*?date-range">(.*?)<.*?<h2>.*?href="(.*?)".*?>(.*?)</s);
        if (showMatch && showMatch.length > 2) {
            ri.date = showMatch[1].trim();

            // TODO: record end dates of ongoing shows

            let dayAndMonth = m(ri.date, /^\s*[0-9]+\s+[A-Za-z]+/, 0);

            let dt = new Date(dayAndMonth + " " + cyear);
            if (dt && dt.getMonth() < 2 && cmonth > 9) {
                ri.date += " +";
                cyear++;
                dt = new Date(dayAndMonth + " " + cyear);
            }
            if (dt && dt.getMonth() != cmonth && (dt.getMonth() - cmonth) < 3) {
                ri.date += " =";
                cmonth = dt.getMonth();
            }
            ri.dt = dt.valueOf();
            ri.text = "";
            ri.venue = "Mwldan";
            ri.url = `https://mwldan.co.uk${showMatch[2]}`;
            ri.title = showMatch[3];
            let rawCategory = m(show, /event-category">(.*?)<\/li>/s).replace(/<.*?>/sg, "").toLowerCase();
            ri.category = (rawCategory.indexOf("film") >= 0 ? "film" :
                rawCategory.indexOf("cinema") >= 0 ? "film" :
                    rawCategory.indexOf("broadcast") >= 0 ? "broadcast" :
                        rawCategory);
            r.push(ri);
        }
    })
    return r;
}

handlers["moylgrove"] = async () => {
    let source = await ftext("https://moylgrove.wales/events");
    let ul = m(source, /<ul[^>]*eventList.*?<\/ul>/s, 0);
    let eventLi = ul.split('</li>');
    let r = [];
    eventLi.forEach(li => {
        let ri = {};
        ri.url = m(li, /data-url=['"](.*?)['"]/);
        ri.image = m(li, /<img [^>]*src=['"](.*?)['"]/s);
        ri.title = attr(li, "eventTitle");
        ri.subtitle = attr(li, "subtitle");
        ri.venue = attr(li, "where") || "Moylgrove";
        ri.price = attr(li, "eventPrice");
        ri.text = attr(li, "eventDescription");
        ri.category = "live";

        let dsm = m(attr(li, "eventDate"), /^.*?:[0-9][0-9]/, 0).replace(/th|nd|st|rd/, '');
        if (dsm) {
            let date = new Date(dsm);
            ri.date = date.toISOString()?.substring(0, 16).replace("T", " ");
            ri.dt = date?.valueOf() || 0;
            r.push(ri);
        }
    });
    return r;
}

let ticketsolve = async (tsid) => {
    let response = await ftext(`https://${tsid}.ticketsolve.com/shows.xml`);
    let venues = response.split("</venue>");

    let r = [];
    venues.forEach(v => {
        let venueNameElement = v.match(/<name>.*?<\/name>/s);
        if (venueNameElement) {
            let venueName = m(venueNameElement[0], /<!\[CDATA\[(.*?)\]\]/s);
            let shows = v.match(/<show .*?<\/show>/sg);
            shows?.forEach(s => {
                let showNameElement = s.match(/<name>.*?<\/name>/s);
                if (showNameElement) {
                    let showName = m(showNameElement[0], /<!\[CDATA\[(.*?)\]\]/s);
                    let description = m(s, /<description>(.*?)<\/description>/s);
                    let images = m(s, /<images>(.*)<\/images>/s);
                    let imageUrl = m(images, /(https:[^<]*)/s);
                    let eventSection = m(s, /<events>(.*?)<\/events>/s);
                    let events = eventSection.split("</event>");
                    events.forEach(e => {
                        let date = m(e, /<date_.*?>(.*?)</s);
                        if (date) {
                            let url = m(e, /<url>(.*?)<\/url>/s);
                            r.push({
                                venue: venueName,
                                date: date.substring(0, 16).replace("T", " "),
                                dt: new Date(date).valueOf(),
                                image: imageUrl,
                                title: showName,
                                url: url,
                                text: m(description, /<!\[CDATA\[(.*?)\]\]/s).replace(/<.*?>/gs, " ")
                            });
                        }
                    })
                }
            })
        }
    })
    return r;
};

handlers["span"] = async () => {
    return await ticketsolve("span-arts");
}

handlers["stdavids"] = async () => {
    return await ticketsolve("stdavidscathedral");
}
/*
let ticketsource = async (source) => {
    console.log("1 [" + source + "]");
    let r = [];
    try {
        let src = `https://ticketsource.co.uk/${source}?v=${Date.now()}`;
        let response = await ftext(src);
        console.log("2 file [" + "] " + src + response.length + "\n" + response.substring(0,1000));
        let sections = response.split("<section");
        console.log("Sections " + sections.length);
        sections.forEach(s => console.log(":- " + s.substring(0,100)));
        let eventsSection = m(response, /id="events".*?>(.*)section/s);
        console.log("events section " + eventsSection.length);
        let venues = eventsSection.split(/eventRow/);
        console.log("venues " + venues.length);
        venues.forEach(v => {
            console.log(v);
            if (v) {
                let ri = {};
                ri.url = `https://ticketsource.co.uk` + m(v, /href="([^"]*)/);
                ri.image = m(v, /<img [^>]*src="([^"]*)"/s);/*
                ri.title = m(v, /eventTitle.*?>(.*?)<\/div>/s).replace(/<.*?>/g, "");
                ri.venue = m(v, /venueAddress.*?>(.*?)<\/span>/s).replace(/<.*?>/g, "");
                ri.date = m(/dateTime.*?>(.*?)<\/div>/s).replace(/<.*?>/g, "");
                ri.dt = new Date(m(/dateTime.*?content="([^"]*)/s)).valueOf();
                ri.text = "Côr Dyfed Choir";
                if (ri.dt && ri.url) {
                    r.push(ri);
                } 
            }
        });
    } catch (e) { console.log(e.toString()) }
    return r;
}
handlers["cordyfed"] = await ticketsource("cor-dyfed-choir");
*/

handlers["rhosygilwen"] = async () => {
    let response = await fetch(`https://rhosygilwen.co.uk/wp-admin/admin-ajax.php?action=mec_grid_load_more&atts[sk-options][grid][limit]=100`).then(r => r.json());
    let chunks = response.html?.match(/<article.*?<\/article>|<script.*?<\/script>/gs) || [];

    let r = [];
    chunks.forEach(v => {
        if (v.indexOf("<script") == 0) {
            let jsonMatch = v.match(/\{.*\}/s)[0];
            let jso = JSON.parse(jsonMatch);
            r.push({
                date: jso.startDate,
                dt: new Date(jso.startDate).valueOf(),
                venue: "Rhosygilwen",
                price: jso.offers?.price,
                image: jso.image,
                title: jso.name,
                category: "live",
                url: jso.url,
                text: jso.description
            });
        }
    });
    return r;
}

module.exports = async function (context, req) {

    const venue = req.query?.venue || "";
    const x = req.query?.x;
    //context.log("Events index venue=" + venue);
    let r = [];
    if (venue) {
        let handler = handlers[venue];
        if (handler) {
            r = await handler(x);
        }
    } else {
        r = Object.keys(handlers);
    }
    context.res = {
        body: JSON.stringify(r),
        headers: { "Content-Type": "application/json" },
        status: 200
    }
}

//console.log(module);
//console.log(handlers);