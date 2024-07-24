import Safety from "./safety.js";
class Modules {
    async getModules(loopKey) {
        const modules = await fetch("http://api.nexusfn.net/api/v2/loopkey/modules", {
            method: 'GET',
            headers: {
                "loopkey": loopKey
            }
        }).then(res => res.json());
        if (modules.status !== "ok") {
            //console.log(modules);
            Safety.registerLoopKey();
            return false;
        }
        if (!modules)
            return [];
        const modulesJSON = modules;
        const modulesArray = modulesJSON.modules;
        return modulesArray;
    }
    async configureModules(modules) {
        try {
            Safety.modules.Shop = modules.includes("shop");
            Safety.modules.Matchmaking = modules.includes("matchmaker");
        }
        catch (error) {
        }
    }
}
export default new Modules();
//# sourceMappingURL=modules.js.map