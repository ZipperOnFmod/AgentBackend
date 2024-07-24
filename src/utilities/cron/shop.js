import Cron from "croner";
import modules from "../modules.js";
import Safety from "../safety.js";
import log from "../structs/log.js";
import Shop from '../shop.js';
if (Safety.env.ENABLE_CLOUD) {
    log.backend("Cloud features enabled.");
    const LOOP_KEY = await Safety.getLoopKey();
    const availabeModules = await modules.getModules(LOOP_KEY);
    if (!availabeModules)
        log.warn("Are you sure you have a valid loop key?");
    modules.configureModules(availabeModules);
    if (Safety.modules.Shop) {
        log.backend("Shop module enabled");
        const shopCron = Cron('0 0 * * *', () => {
            console.log("Updating shop");
            Shop.updateShop(LOOP_KEY);
        });
    }
}
//# sourceMappingURL=shop.js.map