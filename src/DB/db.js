import { v4 as uuid } from "uuid";
import FishModel from "./models/Fish.js";
import UserModel from "./models/Users.js";

class Database {
    async initializeLocalUser() {
        const user = new UserModel({ userId: uuid() })
        await user.save()
    }
    async getFishById(fishId) {
        return FishModel.findOne({ fishId: fishId })
    }

    async saveFishIfNotExists(fishId, name_en, windows, intuitionFish, bigFish, alwaysAvailable) {
        let newFish = new FishModel({
            fishId: fishId,
            name_en: name_en,
            windows: windows,
            intuition_fishIds: intuitionFish,
            bigFish: bigFish,
            alwaysAvailable: alwaysAvailable
        })

        return FishModel.findOneAndUpdate({ fishId: fishId }, { $setOnInsert: newFish },
            { upsert: true, new: true, runValidators: true })
    }

    async updateFishWindows(fishId, newWindows) {
        return FishModel.findOneAndUpdate({ fishId: fishId }, { windows: newWindows })
    }
}

const database = new Database()
export default database 