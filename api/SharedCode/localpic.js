const sharp = require("sharp");
const fs = require('fs');
const fsp = require('fs/promises');

class FileStorer {
    #folder;

    constructor(cache) {
        this.#folder = cache[cache.length - 1] == '/' ? cache : cache + '/';
    }

    async get(name) {
        return await fsp.readFile(this.#folder + name)
    }
    async put(name, type, buffer) {
        await fsp.mkdir(this.#folder, { recursive: true });
        let opts = { flush: true };
        if (typeof buffer === 'string') opts.encoding = 'utf-8';
        return await fsp.writeFile(this.#folder + name, buffer, opts);
    }

    /**
     * Whether a file exists
     * @param {*} name possibly without a .suffix
     * @returns name of the file that was found (including a missing suffix) or false
     */
    has(name) {
        if (fs.existsSync(this.#folder + name)) return name;
        if (name.indexOf('.')>0) return false; 
        return fs.readdirSync(this.#folder).find(f=>f.substring(0,name.length)==name) || false;
    }
}

class Cache {

    #storer;
    #picSize;

    /**
     * @param {{get(name), put(name, type, arrayBuffer)}} storer Store the compressed picture
     * @param {*} picSize 
     */
    constructor(storer, picSize = 300) {
        this.#storer = storer;
        this.#picSize = picSize;
    }

    async #fetchfile(url, sendHeaders = false) {
        let headers = !sendHeaders ? null : {
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/jpeg,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
        };
        return await fetch(url, headers);
    }

    #hashUrl(url) {
        const trimmed = url.replace(/[?#].*/, "");
        const suffix = trimmed.match(/(\.[^.\/]*)$/)?.[1] || "";
        const TE = new TextEncoder();
        const padding = "        ".substring(0, 8 - trimmed.length % 8);
        const code = TE.encode(trimmed + padding);
        let bb = new BigUint64Array(code.buffer);
        for (let i = 1; i < bb.length; i++) {
            bb[0] ^= bb[i];
        }
        return "" + bb[0] + suffix;
    }

    /**
     * getAndCache - stores a local compressed copy of a picture
     * @param {string} url Source pic
     * @param {bool} get=true: return the cache content; if false, just store the file in cache
     * @param {string} name [opt]
     * @param {number} size [opt] required width default 300px
     * @returns {pic ArrayBuffer, name}
     */
    async getCache(url, get = true, name, size = this.#picSize) {
        let hashName = name || this.#hashUrl(url);
        let storeName = this.#storer.has(hashName); // may have suffix appended
        let wasCached = false;
        if (!storeName) {
            //console.log("not got");
            storeName = hashName;
            try {
                const blob = await this.#fetchfile(url, true).then(r => r.blob());
                const fileType = blob.type;
                const arrayBuffer = await blob.arrayBuffer();
                const resized = await sharp(arrayBuffer).resize({ width: size }).toBuffer();
                if (storeName.indexOf('.')<0) {
                    if (fileType.indexOf("jp")>0) storeName += ".jpg";
                    else if (fileType.indexOf("png")>0) storeName += ".png";
                    else if (fileType.indexOf("gif")>0) storeName += ".gif";
                    else console.log("File type:" + fileType);
                }
                await this.#storer.put(storeName, fileType, resized);
            } catch (e) {
                console.log(`Couldn't convert ${url} e`);
                if (get)
                    return { pic: new Uint8Array(arrayBuffer), name: url, error: e }
                else return { name: url, error: e }
            }
        } else {
            //console.log("got it");
            wasCached = true;
        }
        if (get) {
            return { pic: await this.#storer.get(storeName), name: storeName, wasCached: wasCached };
        }
        else {
            return { name: storeName, wasCached: wasCached }
        }
    }
}


module.exports = {
    Cache: (storer, picSize = 300) => new Cache(storer, picSize),
    FileStorer: (cacheLoc = "client/pix/") => new FileStorer(cacheLoc)
}
