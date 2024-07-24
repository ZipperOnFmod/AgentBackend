class logger {
    base(color, type, message) {
        console.log(`\x1b[37m[\x1b[${color}m${type}\x1b[0m\x1b[37m] ${message}`)
    }
    backend(message) {
        this.base(32, "Agent", message);
        //console.log(`\x1b[37m[\x1b[32mAgent\x1b[0m\x1b[37m] ${message}`);
    }
    bot(message) {
        this.base(35, "Discord", message);
        //console.log(`\x1b[37m[\x1b[35mDiscord\x1b[0m\x1b[37m] ${message}`);
    }
    xmpp(message) {
        this.base(34, "XMPP", message);
        //console.log(`\x1b[37m[\x1b[35mXMPP\x1b[0m\x1b[37m] ${message}`);
    }
    mms(message) {
        this.base(35, "MMS", message);
        //console.log(`\x1b[37m[\x1b[35mMMS\x1b[0m\x1b[37m] ${message}`);
    }
    mms_debug(message) {
        if (process.env.DEBUG_LOG == "true") {
            this.base(34, "MMS Debug", message);
            //console.log(`\x1b[37m[\x1b[34mMMS DEBUG\x1b[0m\x1b[37m] ${message}`);
        }
    }
    error(message) {
        this.base(31, "Error", message);
        //console.log(`\x1b[37m[\x1b[31mERROR\x1b[0m\x1b[37m] ${message}`);
    }
    request(message) {
        this.base(36, "Panel", message);
        //console.log(`\x1b[37m[\x1b[36mREQUEST\x1b[0m\x1b[37m] ${message}`);
    }
    panel(message) {
        this.base(33, "Panel", message);
        //console.log(`\x1b[37m[\x1b[33mPANEL\x1b[0m\x1b[37m] ${message}`);
    }
    debug(message) {
        if (process.env.DEBUG_LOG == "true") {
            this.base(34, "Debug", message);
            //console.log(`\x1b[37m[\x1b[34mDEBUG\x1b[0m\x1b[37m] ${message}`);
        }
    }
    warn(message) {
        this.base(33, "Warn", message);
        //console.log(`\x1b[37m[\x1b[33mWARN\x1b[0m\x1b[37m] ${message}`);
    }
    database(message) {
        this.base(33, "Database", message);
        //console.log(`\x1b[37m[\x1b[33mWARN\x1b[0m\x1b[37m] ${message}`);
    }
    webhook(message) {
        this.base(36, "Webhook", message);
        //console.log(`\x1b[37m[\x1b[33mWARN\x1b[0m\x1b[37m] ${message}`);
    }
    api(message) {
        this.base(36, "API", message);
        //console.log(`\x1b[37m[\x1b[36mAPI\x1b[0m\x1b[37m] ${message}`);
    };
}
export default new logger();
//# sourceMappingURL=log.js.map