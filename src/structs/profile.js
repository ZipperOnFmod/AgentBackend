import path from "path";
import log from "../utilities/structs/log.js";
import { dirname } from 'dirname-filename-esm';
const __dirname = dirname(import.meta);
import fs from "fs";
async function createProfiles(accountId) {
    log.debug(`Creating profiles for account ${accountId}`);
    let profiles = {};
    fs.readdirSync(path.join(__dirname, "../profiles/")).forEach(fileName => {
        try {
            const profile = JSON.parse(fs.readFileSync(path.join(__dirname, `../profiles/${fileName}`), 'utf-8'));
            profile.accountId = accountId;
            profile.created = new Date().toISOString();
            profile.updated = new Date().toISOString();
            profiles[profile.profileId] = profile;
            log.debug(`Created profile ${profile.profileId} for account ${accountId}`);
        }
        catch (error) {
            console.error(`Error parsing JSON file ${fileName}:`, error);
        }
    });
    return profiles;
}
async function validateProfile(profileId, profiles) {
    try {
        let profile = profiles.profiles[profileId];
        if (!profile || !profileId)
            throw new Error("Invalid profile/profileId");
    }
    catch {
        return false;
    }
    return true;
}
export default { createProfiles, validateProfile };
//# sourceMappingURL=profile.js.map