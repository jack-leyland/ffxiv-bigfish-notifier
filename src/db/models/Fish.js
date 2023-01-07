import mongoose from "mongoose"
const Schema = mongoose.Schema;

const FishSchema = new Schema({
    fishId: {
        type: Number,
        required: true,
        unique: true
    },
    name_en: {
        type: String,
        required: true,
    },
    big_fish: {
        type: Boolean,
        required: true,
    },
    intuition_fishIds: {
        type: [Number],
    },
    always_available: {
        type: Boolean,
        required: true,
    },
})

const FishModel = mongoose.model('fish', FishSchema);
export default FishModel;