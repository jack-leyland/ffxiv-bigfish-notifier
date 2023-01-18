import { Subject } from "rxjs";

/**
 * Converts the stream of data from the underlying data source into a stream of
 * subscribable minute timers for each trackable fishId. Each fishId (of fish
 * that are not always available ), has a subscribable object which contains 10
 * timers representing the minutes until each of the upcoming 10 fish windows
 * open, and the original timestamp for when that window opens.
 *
 * The data from the data source is basically a stream of windows start
 * timestamps, for each fish, that comes in every second (it is extracted by the
 * FishEntryProcessor from the UI update data that is calculated every second by
 * the orginal app that this project wraps around.)
 *
 * The data source stream contains mostly duplicate values (the same array of
 * windows every time), so we use a cache to ignore those duplicates. I have
 * chosen to implement the system like this so that it will basically always
 * work no matter what happens to the underlying fish data. All we have to do is
 * update the fish data files every patch and this should work fine, and it
 * saves us having to redo all the work Carby did to actually calculate the
 * windows ourselves from the raw data just to suit the specific purpose of this
 * app.
 *
 * Updates to the window timestamps that the timers are based on are queued such
 * that the timer values are synchronized to the start time of the tick where
 * they are being processed. We want all the timer values (which are in minutes)
 * to be ticking at the same rate.
 *
 * On the distance between tick start and window start:
 *  - It can obviously be fractional. (i.e the window opens 10mins and 25
 *    seconds from the start of this tick)
 *  - However, we are rounding to the nearest minute, so in that example, the
 *    notifcation will be fired 25 seconds early.
 *  - In this way, the latest/earliest any notification will ever be sent out by
 *    compared to actual start time is 30 seconds.
 *  - The client won't allow arbitraty notification time settings (it will be a
 *    minutes value between 10 mins and 6 hours ), so this level of granualarity
 *    and margin of error is acceptable. Can always be refactored to expose
 *    seconds-level granualarity timers if we every want that in the future.
 *
 */

class WindowUpdate {
  constructor(fishId, startTs) {
    this.fishId = fishId;
    this.startTs = startTs;
  }
}

export default class CountdownPublisher {
  constructor() {
    /**
     * The structure for each fishId could be a Set instead, but I find this
     * easier to reason about.
     *
     * Cache Structure:
     *  {
     *   fishId: { rawWindowStartTs: boolean (always true) ...more
     *   }
     *   ...more
     *  }
     *
     */
    this.rawValueCache = {}

    /**
     * fishTimers[id] = {
     *  fishId: id,
     *  timers: [{minutes: int, rawTS: int}, ...more ]
     *  }
     *
     */
    this.fishTimers = {};
    this.fishSubjects = {};
    /**
     * IMPORTANT: This Queue *must* be consumed in FIFO manner for it to
     * work properly (i.e. processing windows in encountered order, which in
     * or case also preserves the sorted order they're given to us in).
     */
    this.processingQueue = [];

    this.ticker = null;
    this.initialized = false;
    /**
     * Start listening for updates on creation.
     */
    this.start()
  }

  start() {
    this.ticker = setInterval(this.tick.bind(this), 60000);
  }

  stop() {
    if (this.started) {
      clearInterval(this.ticker)
    }
  }

  tick() {
    console.time("tick")
    let tickStart = Date.now()
    this.decrementTimers()
    this.processQueuedUpdates(tickStart)
    this.notifySubjects()
    console.timeEnd("tick")
    // Set initialized on first tick so we know when fish Subjects are ready
    // to be subscribed to.
    if (!this.initialized) { this.initialized = true; };
  }

  /**
   * We call this every tick at the end, to notify subscribers of each fish of
   * the new timer vals.
   */
  notifySubjects() {
    for (const id in this.fishSubjects) {
      this.fishSubjects[id].next(this.fishTimers[id])
    }
  }

  /**
   * Queue a window update for each window.
  */
  addNewFish(fishId, windows) {
    this.rawValueCache[fishId] = {}
    for (let i = 0; i < windows.length; i++) {
      // Initialize the empty timer array for the new fish here so that
      // the queue processing logic is the same every update object.
      this.fishTimers[fishId] = { fishId: fishId, timers: [] };
      this.rawValueCache[fishId][windows[i].start] = true
      this.processingQueue.push(new WindowUpdate(fishId, windows[i].start))
      this.fishSubjects[fishId] = new Subject()
    }
  }

  /**
   * Performed during each tick, after expired timers have been cleared. By
   * the time we are here, we know already that it is new data
   */
  processQueuedUpdates(tickStart) {
    for (const update of this.processingQueue) {
      let timerObj = {
        minutes: Math.round(((update.startTs - tickStart) / 1000) / 60),
        rawTs: update.startTs
      }
      this.fishTimers[update.fishId].timers.push(timerObj)
    }
    this.processingQueue = []
  }

  /**
   * Decrement existing timers for all fish. Remove expired ones.
   */
  decrementTimers() {
    for (const id in this.fishTimers) {
      for (let i = 0; i < this.fishTimers[id].timers.length; i++) {
        this.fishTimers[id].timers[i].minutes -= 1
        if (this.fishTimers[id].timers[i].minutes <= 0) {
          /**
           * Theorically, given that all timestamps on which the
           * timers are based on are given to us and processed in
           * sorted increasing order, a shift would work here too.
           * But, why make that assumption if we don't have to? This
           * solution works even if the timers are unsorted (I'm
           * pretty sure?)
           */
          let removedTimer = this.fishTimers[id].timers.splice(i, 1)
          // Don't forget to delete the now stale cache entry or we'll be leaking memory!
          delete this.rawValueCache[id][removedTimer.rawTs]
        }
      }
    }
  }

  /**
   * The cache needs to be updated at the same rate (every second) that the
   * data is coming in from the source, such that we can identify both new
   * fish coming in (mainly at initialization) and new ranges. We only want to
   * queue window updates that contain a new window.
   *
   * Clearing the cache entries for old windows happens at the rate of the
   * timer tick (every minute) when timers that reach zero are removed.
   *
   */
  processWindows(fishId, windows) {
    // Unseen fishId? Cache and queue all the windows.
    if (this.rawValueCache[fishId] === undefined) {
      // Don't worry, this function takes care of the new fish's window
      // caching for us too
      this.addNewFish(fishId, windows);
      return
    }

    //Seen this fish? Are any of the windows new?
    for (const win of windows) {
      if (!this.rawValueCache[fishId][win.start]) {
        // Don't forget to cache this window so we remember that we've
        // seen it already!
        this.rawValueCache[fishId][win.start] = true;
        this.processingQueue.push(new WindowUpdate(fishId, win.start))

      }
    }
  }
}
