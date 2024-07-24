import mongoose from "mongoose";

const SentToSchema = new mongoose.Schema({
    username: { type: String, required: true },
    sentAmount: { type: Number, required: true },
    SentDate: { type: Date, required: true }
}, { _id: false });

const GiftingSchema = new mongoose.Schema({
    created: { type: Date, required: true },
    discordId: { type: String, required: true },
    gifts: { type: Number, required: true },
    SentTo: [SentToSchema] // Define SentTo as an array of objects
}, {
    collection: "gifting"
});

const model = mongoose.model('Gifting', GiftingSchema);

export default model;
