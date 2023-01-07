import database from "../../db/db.js";

export class ConsoleNotifier {
    async sendNotification(request) {
        console.log(`[${request.userId}]:` + "The window for " + request.fishName + " opens in " + request.timeUntil + " minutes.")
    }
}