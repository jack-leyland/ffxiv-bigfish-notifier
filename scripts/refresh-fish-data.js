/**
 * This script refreshes the fish refrence data kept in the DB. It does so  by
 * just running carby's app for a few seconds and reading in the first few UI
 * updates for new records and upserting the data.
 *
 * This will only need to be run after an FFXIV patch with new fish comes out,
 * and it is generally best to wait until the window condition data is fully
 * solved for by the community.
 *
 * It will not apply updates to the fishId values themselves, under the
 * assumption that those are not going to change in game. If they do, we have
 * bigger problems that will need to be handled separately since the schema
 * doesn't currently cascade primary key updates for the fish (referenced by all
 * the subscriptions).
 *
 * Running it in a prod environment will update the prod database, so this
 * should not be run while the main app is runnning. The service will need to be
 * brought down for maintenance to perform these updates.
 *
 * KNOWN ISSUE: 
 * In the very rare case that an intuition requirement is *removed*
 * for a given fish, any existing subscriptions to that old intuition
 * requirement's fishId will still exist, and the user will still get the
 * notifications even though it's not a requirement any more. The notification
 * though, will no longer tell the user that it is required by that fishId.
 * Given that this is very unlikely to happen, I am not going to handle it
 * unless it becomes an issue. If this happens to a user, they will just have to
 * delete the subscription to the parent fish and resubscribe to get the new
 * requirements subscriptions.
 *
 */

import { ViewModel as DataSource } from '../src/fish-data-engine/viewmodel.js'
import CountdownPublisher from '../src/notification-service/CountdownPublisher.js'
import FishEntryProcessor from '../src/notification-service/FishEntryProcessor.js'
import until from '../src/common/util/Until.js'
import { CONFIG } from '../src/common/config.js'

const updateScript = async () => {
    console.log("Performing Fish Data Update.")

    CONFIG.DB_FISH_DATA_REFRESH = true;

    const publisher = new CountdownPublisher()
    const fishEntryProcessor = new FishEntryProcessor(publisher)
    const source = new DataSource(fishEntryProcessor)
    source.initialize()

    let finished = false;
    setTimeout(() => finished = true, 10000)
    await until(()=> finished === true)
    console.log("Fish Data Update Successful.")
    process.exit()
}

updateScript()

