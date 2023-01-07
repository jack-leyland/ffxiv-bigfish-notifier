/**
 * Some important considerations here:
 *
 * When a new patch comes out, updates should need to happen only inside the
 * fish-data-engine. As the data from carby's app is updated, as long as the
 * FishEntry object has the same properties (included the nested Fish Object in
 * the data property), this should be able to ingest new fish just fine.
 *
 */

import database from "../db/db.js";

export default class FishEntryProcessor {
    // Accepts FishEntry Object from fish-data-engine (Carby's data structure
    // from the orginial ff14-fish-tracker-app)
    constructor(coutdownPublisher) {
        this.publisher = coutdownPublisher;
    };

    async ingestEntry(entry) {
        if (!entry) {
            console.warn("FishEntryProcessor: Null or undefined FishEntry ingested.")
            return
        }

        try {
            // We only care about fish that are on timers.
            if (entry.data.alwaysAvailable) return

            const windows = entry.availability.upcomingWindows.map((obj) => { return { start: obj.start } })
            this.publisher.processWindows(entry.data._id, windows)

        } catch (err) {
            console.error("FishEntryProcessor: Error occured processing FishEntry. " +
                "This can happen if the FishEntry object does not have the expected shape.")
            console.error("Problematic Entry: \n")
            console.log(entry)
            console.error(err)
        }
    };

    /** 
     * We'll add some functionality to ensure that our database stays up to date
     * based on what we are seeing from the data source, but separate from all
     * the timer processing. We want to keep track of all possible fishIds,
     * their intuition requirements (needed by the User class to figure out
     * notification requirements), and whether or not the ID is a bigfish (used
     * by the client to populate the options for the user)
     *
     * Technically, we don't reallyyy need to do this on every message from the
     * datasource. But, doing it this way is an easy way to always ensure our
     * database always automatically reflects the currently available data from
     * Carby's app, no matter what kind of new data is added by their update
     * process. Changing the way this happens is probably an easy optimization
     * point if we start encountering performance issues. 
     *
     * Ideally, every patch we only want to have to update stuff inside of
     * fish-data-engine, and just have everything else work fine automatically.
     * This is a way of accomplishing that.
     */

    async ensureDatabaseState(entry) {
        if (!entry) {
            console.warn("FishEntryProcessor: Null or undefined FishEntry ingested.")
            return
        }

        try {

            let intuitionFishIds = []

            if (entry.data.intuitionFish && entry.data.intuitionFish.length > 0) {
                intuitionFishIds = entry.data.intuitionFish.map((fish) => {
                    return fish.data._id
                })
            }

            await database.upsertFishRecord(entry.data._id, entry.data.name, intuitionFishIds,
                entry.data.bigFish, entry.data.alwaysAvailable)

        } catch (err) {
            console.error("FishEntryProcessor: Error verifying database state. " +
                "This can happen if the FishEntry object does not have the expected shape.")
            console.error("Problematic Entry: \n")
            console.log(entry)
            console.error(err)
        }

    }

}