import mongoose from "mongoose";
const CreatorSchema = new mongoose.Schema({
    created: { type: Date, required: true },
    discordId: { type: String, required: true, unique: true },
    accountId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    creatorcode: { type: String, required: true, unique: true },
}, {
    collection: "creatorcodes"
});
const model = mongoose.model('CreatorSchema', CreatorSchema);
export default model;
//# sourceMappingURL=user.js.map