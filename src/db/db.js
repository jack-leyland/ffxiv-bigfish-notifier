import { v4 as uuid } from "uuid";
import FishModel from "./models/Fish.js";
import UserModel from "./models/Users.js";

class Database {
    async initializeLocalUser() {
        const user = new UserModel({ userId: uuid() })
        return user.save()
    }

    async getFishById(fishId, field) {
        if (field === undefined) {
            return FishModel.findOne({ fishId: fishId })
        } else {
            return FishModel.findOne({ fishId: fishId }, field)
        }
    }


    async upsertFishRecord(fishId, name_en, intuitionFish, bigFish, alwaysAvailable) {
        let newFish = {
            fishId: fishId,
            name_en: name_en,
            intuition_fishIds: intuitionFish.length > 0 ? intuitionFish : null,
            big_fish: bigFish,
            always_available: alwaysAvailable,
        }
        return FishModel.updateOne({ fishId: fishId }, newFish, { upsert: true })
    }
}

const database = new Database()
export default database 