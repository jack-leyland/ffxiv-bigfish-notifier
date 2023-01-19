import database from "../../db/db.js";

export class ConsoleNotifier {
    async sendNotification(request) {
        let row = await database.getFishById(request.fishId)
        console.log(`[${request.userId}]:` + "The window for " + row.name_en + " opens in " + request.timeUntil + " minutes.")
    }
}