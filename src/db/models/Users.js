import mongoose from "mongoose"
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    notification_strategies: {
        type: [String],
    },
    subscribed_fish: [{
        type: {
            fishId: {
                type: Number
            },
            minutes_before: {
                type: Number
            }
        }
    }]
})

const UserModel = mongoose.model('user', UserSchema);
export default UserModel;
