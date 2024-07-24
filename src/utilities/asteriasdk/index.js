import os from "os";
function generateUniqueIdentifier() {
    const ip = os.networkInterfaces();
    const operatingSystem = os.platform();
    const encoded = Buffer.from(`${ip}-${operatingSystem}`).toString("base64");
    return encoded;
}
;
class Asteria {
    collectAnonStats;
    uid;
    usedURL;
    throwErrors;
    constructor(options) {
        this.collectAnonStats = options.collectAnonStats;
        if (!this.collectAnonStats) {
            throw new TypeError("The 'collectAnonStats' option must be a boolean value of either true or false.");
        }
        this.uid = this.collectAnonStats ? generateUniqueIdentifier() : "disabled";
        this.usedURL = new URL(options.usedURL ? options.usedURL : "https://api.asteria.nexusfn.net/api/");
        this.throwErrors = options.throwErrors ? options.throwErrors : false;
    }
    async getEntity(key, value, entity, ignoreErrors) {
        const req = await fetch(`${this.usedURL}${entity}/`, {
            method: "GET",
            headers: {
                "key": key,
                [key]: value,
                "uid": this.uid
            }
        });
        if (!req.ok) {
            if (req.status === 404) {
                if (ignoreErrors)
                    return;
                if (this.throwErrors)
                    throw new Error(`Entity ${entity} could not be found by Key ${key} and Value ${value}. Please check your Key and Value.`);
            }
            else {
                if (ignoreErrors)
                    return;
                throw new Error(`Error ${req.status} occurred while fetching ${entity} with key ${key} and value ${value}.`);
            }
        }
        const reqJson = await req.json();
        const document = reqJson.document;
        return await document;
    }
    async getCosmetic(key, value, ignoreErrors) {
        try {
            if (ignoreErrors !== undefined)
                return this.getEntity(key, value, "battleroyale", ignoreErrors);
        }
        catch (error) {
        }
    }
    ;
    async getBanner(key, value, ignoreErrors) {
        try {
            if (ignoreErrors !== undefined)
                return this.getEntity(key, value, "banners", ignoreErrors);
        }
        catch (error) {
        }
    }
    ;
    async getPlaylist(key, value, ignoreErrors) {
        try {
            if (ignoreErrors !== undefined)
                return this.getEntity(key, value, "playlists", ignoreErrors);
        }
        catch (error) {
        }
    }
    ;
    async getPoi(key, value, ignoreErrors) {
        try {
            if (ignoreErrors !== undefined)
                return this.getEntity(key, value, "pois", ignoreErrors);
        }
        catch (error) {
            throw new Error(error);
        }
    }
    ;
}
export default Asteria;
//# sourceMappingURL=index.js.map