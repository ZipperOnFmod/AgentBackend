import mongoose from "mongoose";
const UserSchema = new mongoose.Schema({
    authToken: { type: String, required: true },
    created: { type: Date, required: true },
    banned: { type: Boolean, default: false },
    discordId: { type: String, required: true, unique: true },
    accountId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    username_lower: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mfa: { type: Boolean, default: false },
    matchmakingId: { type: String, default: null },
    lastDaily: { type: Date, default: null },
    wins: { type: Number, default: 0 },
    kills: { type: Number, default: 0 },
    hwid: { type: String },
    full_locker: { type: Boolean, default: false },
    boostrewards: { type: Boolean, default: false },
    frozentier: { type: Boolean, default: false },
    icontier: { type: Boolean, default: false },
    Agentplus: { type: Boolean, default: false },
    Agentplusreward: { type: Date, default: null },
}, {
    collection: "users"
});
const model = mongoose.model('UserSchema', UserSchema);
export default model;
//# sourceMappingURL=user.js.map