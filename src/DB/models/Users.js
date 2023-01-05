import mongoose from "mongoose"
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    notification_actors: {
        type: [String],
    },
    subscribed_fish: {
        type: [Number]
    }
})

const UserModel = mongoose.model('user', UserSchema);
export default UserModel;
