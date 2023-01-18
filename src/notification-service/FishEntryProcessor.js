/**
 * Some important considerations here:
 *
 * When a new patch comes out, updates should need to happen only inside the
 * fish-data-engine. As the data from carby's app is updated, as long as the
 * FishEntry object has the same properties (included the nested Fish Object in
 * the data property), this should be able to ingest new fish just fine.
 *
 */

import { logger } from "../common/logger.js";
import database from "../db/db.js";
import { InternalError } from "./Errors.js";

export default class FishEntryProcessor {
  // Accepts FishEntry Object from fish-data-engine (Carby's data structure
  // from the orginial ff14-fish-tracker-app)
  constructor(coutdownPublisher) {
    this.publisher = coutdownPublisher;
  };

  async ingestEntry(entry) {
    if (!entry) {
      logger.warn("FishEntryProcessor: Null or undefined FishEntry ingested.")
      return
    }

    try {
      // We only care about fish that are on timers.
      if (entry.data.alwaysAvailable) return

      const windows = entry.availability.upcomingWindows.map((obj) => { return { start: obj.start } })
      this.publisher.processWindows(entry.data._id, windows)

    } catch (err) {
      logger.error("FishEntryProcessor: Error occured processing FishEntry. " +
        "This can happen if the FishEntry object does not have the expected shape.")
      logger.error(entry)
      logger.error(err)
      throw InternalError()
    }
  };

  async ensureDatabaseState(entry) {
    if (!entry) {
      logger.warn("FishEntryProcessor: Null or undefined FishEntry ingested.")
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
      logger.error("FishEntryProcessor: Error verifying database state. " +
        "This can happen if the FishEntry object does not have the expected shape.")
      logger.log(entry)
      logger.error(err)
      throw InternalError()
    }
  }
}
