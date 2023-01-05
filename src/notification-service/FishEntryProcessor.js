import database from "../DB/db.js"

/**
 * Some important considerations here:
 * 
 * When a new patch comes out, updates should need to happen only inside the fish-data-engine. 
 * As the data from carby's app is updated, as long as the FishEntry object has the same properties 
 * (included the nested Fish Object in the data property), this should be able to ingest new fish just fine.
 * 
 */

export default class FishEntryProcessor {
    // Accepts FishEntry Object from fish-data-engine (Carby's data structure from the orginial ff14-fish-tracker-app)
    async ingestEntry(entry) {
        if (!entry) {
            console.warn("FishEntryProcessor: Null or undefined FishEntry ingested.")
            return
        }
        // Wrapping this whole bad boy in a try catch as a way of detecting any changes in Carby's data structure.
        // If fields are not as expected, we'll hear about it and it won't break anything.  
        try {
            await this.saveFishFromEntryIfNotExists(entry)

            let fishData = await database.getFishById(entry.data._id)

            if (!fishData.alwaysAvailable) {
                let now = Date.now()
                // if it exists, then we want to see if we need to update the ranges. 
                //first, purge windows that have ended already
                let oldWindows = fishData.windows
                    .filter((win) => {
                    return win.end >= now
                    })
                    .map((obj) => {
                        return {start: obj.start,end: obj.end}
                    })

                let newWindows = structuredClone(oldWindows)

                entry.availability.upcomingWindows.forEach((win) => {
                    if (win.start > newWindows[newWindows.length - 1].end) {
                        newWindows.push({ start: win.start, end: win.end })
                    }
                })

                //Only update if different
                if (JSON.stringify(oldWindows) !== JSON.stringify(newWindows)) {
                    console.log("Updating windows.")
                    await database.updateFishWindows(entry.data._id, newWindows)
                }
            }

        } catch (err) {
            console.error("FishEntryProcessor: Error occured processing FishEntry. " +
                "This can happen if the FishEntry object does not have the expected shape.")
            console.error(err)
        }

    }

    async saveFishFromEntryIfNotExists(entry) {
        let windows = [];
        let intuitionFish = []
        entry.availability.upcomingWindows.forEach((window) => {
            windows.push({ start: window.start, end: window.end })
        })
        entry.data.intuitionFish.forEach((fish) => {
            intuitionFish.push(fish.data._id)
        })
        return database.saveFishIfNotExists(entry.data._id, entry.data.name, windows, intuitionFish,
            entry.data.bigFish, entry.data.alwaysAvailable)
    }
}