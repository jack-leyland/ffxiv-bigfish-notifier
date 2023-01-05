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
    bigFish: {
        type: Boolean,
        required: true,
    },
    alwaysAvailable: {
        type: Boolean,
        required: true,
    },
    //these numbers are unix epochs
    windows: {
        type:  [{
            start: {
                type: Number
            },
            end: {
                type: Number
            }
        }],
        required: true,
    },
    intuition_fishIds: {
        type: [Number],
    },
})

const FishModel = mongoose.model('fish', FishSchema);
export default FishModel;