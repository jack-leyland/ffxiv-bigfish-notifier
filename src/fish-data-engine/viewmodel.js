/**
 * Source from Carbuncle Plushy's ff14-fish-tracker-app.
 *
 * Prepare for a nice long comment here since I have essentially taken a giant
 * battle axe to most of Carby's original file.
 *
 * What I have essentially done here is strip aways all of the UI related
 * functionality from the viewmodel (as you can image that is most of it). That
 * means: all the HTML/DOM stuff, everything related to site settings, marking
 * fish as completed, activiting fish eyes and all of the user event handling
 * code. Basically, the only surviving functionality in the viewmodel is the
 * stuff that is related to the timer subscriptions. Essentially, this is just
 * updating all of the data objects for the fish as if there was still a UI, and
 * all of the fish are available (not marked as complete). Instead of displaying
 * that data (the fishEntries structure), I am just sending it to my own code to
 * be parsed and filtered down to only what I need to enable the timers I need
 * for the notifications. 
 *
 * The fishEntry objects contains way more data than we actually need, but since
 * I admittedly don't fully understand how it's all calculated, I am just
 * sending it away somewhere else to be stipped down rather than simplfying it
 * here. Not the most efficient solution in the world, but it should work.
 * Before I realized Carby's app was open source, my original idea was gonna be
 * to just periodically scrape the website, so this it at least still better
 * than doing that lol.
 *
 * Eventually, whenever I find the time to fully figure out how this all works
 * with the weather, catchable range calculations, bells etc... I might just
 * reimplement all that in my own way such that its more purpose built for just
 * enabling notifications, rather than supporting an entire app, which of course
 * is what this code was orginally for.
 *
 * Thanks for making this Carby I love the original app <3
 *
 * Original project: https://github.com/icykoneko/ff14-fish-tracker-app/
 */



///////////////////////////////////////////////////////////////////////////////
// View Model (v2)
// ============================================================================
// View model will encapsulate all of the display logic and timer subscriptions.
// Individual displayed fish entries will be HTML elements using data to link
// back to the back-end data model. On initialization, the view model will still
// need to wrap the data model to support all of its fields.


import { DATA } from "./data.js";
import FishWatcher from "./fishwatcher.js";
import dateFns from "./dateFns/main.js";
import { WeatherService } from "./weather.js"
import _ from "underscore"
import { Fishes } from "./fish.js";
import { eorzeaTime } from "./time.js";
import { Subject, merge, interval, buffer, debounceTime, map, filter, timestamp } from "rxjs"
import { CONFIG } from "../common/config.js";

const weatherService = new WeatherService()
const fishWatcher = new FishWatcher(weatherService)

let entries = []

class BaitEntry {
  constructor(itemId) {
    this.id = itemId;
    // Wrap the item data using reference.
    this.itemData = DATA.ITEMS[itemId];
    // If it's a fish, include a reference to that as well.
    // - Unfortunately, we can't expect to find a FishEntry for this record.
    // Using Fishes in order to support live adjustments.
    this.fishData = _(Fishes).findWhere({ id: itemId });
  }

  get name() {
    return __p(this.itemData, "name");
  }

  get icon() {
    return this.itemData.icon;
  }

  get hookset() {
    if (this.fishData && 'hookset' in this.fishData) {
      return this.fishData.hookset;
    }
    return null;
  }

  get tug() {
    if (this.fishData && 'tug' in this.fishData) {
      return this.fishData.tug;
    }
    return null;
  }
}
/**
 * JL Note:
 * For simplicity, we give each fishEntry the ability to send its
 * updates to the FishEntryProcessor within its update function.
 * 
 * The processor passed must be a reference to the one passed to the
 * viewmodel in the entry file. 
 * 
 */
class FishEntry {
  constructor(fish, processor) {

    this.processor = processor

    // TODO:
    this.active = false;
    this.id = fish.id;

    // TODO: Improve this
    // For fish with intuition requirements, include their entries here as
    // well.
    this.intuitionEntries = [];

    // Subscription while active.
    this.subscription = null;

    // HOLD A REFERENCE TO THE FISH DATA!!!
    // What's the alternative? Copying every field into this object?
    // Just make sure you don't leak references...
    this.data = fish;

    // The Fish object actually stores language-specific values in certain
    // fields... This really only helps when the fish is displayed initially
    // though...
    this.data.applyLocalization();

    // Set up the remaining data structure...
    this.isUpSoon = '';
    this.availability = {
      current: {
        duration: null,
        date: null
      },
      upcoming: {
        duration: null,
        date: null,
        downtime: null,
        prevdate: null
      },
      upcomingWindows: [],
    };
    this.isCatchable = false;

    //JL: can I safely get rid of this fish eyes stuff? Doesn't apply to big fish

    // Fish Eyes...
    if (fish.fishEyes === false) {
      this.fishEyesDuration = '';
    }
    else if (fish.fishEyes === true) {
      // Unknown duration, return empty string.
      this.fishEyesDuration = '';
    }
    else if (fish.fishEyes > 60) {
      // If the buff is more than 60s, display in fractional minutes.
      let mins = Math.floor(fish.fishEyes / 60);
      let secs = fish.fishEyes % 60;
      let result = "" + mins + "m";
      if (secs != 0) {
        result += " " + secs + "s";
      }
      this.fishEyesDuration = result;
    }
    else {
      this.fishEyesDuration = '' + fish.fishEyes + 's';
    }

    this.isWeatherRestricted = fish.conditions.weatherSet.length != 0;

    // View model version of bait.
    // TODO: [FIXME-DUPLICATION]
    // Technically, this should ONLY exist as part of the view model, and not
    // within the Fish object.
    // `bait`: Array[BaitEntry]
    this.bait = _(fish.bestCatchPath).map(x => new BaitEntry(x));
  }

  get uptime() { return this.data.uptime(); }

  updateNextWindowData() {
    // WORKAROUND:
    // - For some reason, there's a race condition preventing `update` from
    //   being called with `full` set.  This is probably happening when a
    //   fish's window closes, but the timer event triggers before the
    //   FishWatcher event does. As a result, the cached information regarding
    //   /next catch time/ is never updated, since we don't expect it to change
    //   very often...
    // - This is also due to how the popup for next windows is coded. If we
    //   just generated it on demand, it'd be safer.  Until then, we have this.
    // This function must be called during a `countdown` event where layout
    // returns TRUE, indicating the fish's state has changed. Since it's
    // less efficient to have the view model do this, we'll rely on layout to
    // make this call before it would need to use the data.
    // AGAIN, THIS IS BASICALLY A WORKAROUND. FIX YOUR CRAPPY CODE, PLUSHY!

    let fish = this.data;
    let crs = fish.catchableRanges;

    if (crs.length > 0) {
      let currEnd = eorzeaTime.toEarth(+crs[0].end);
      let nextStart = eorzeaTime.toEarth(+crs[1].start);

      this.availability.upcoming.downtime = dateFns.formatDistanceStrict(
        nextStart, currEnd, { roundingMethod: 'floor' }) + " later";

      this.availability.upcomingWindows = _(crs).map((cr, idx) => {
        let start = eorzeaTime.toEarth(+cr.start);
        let end = eorzeaTime.toEarth(+cr.end);
        let downtime = "";
        if (idx + 1 < crs.length) {
          downtime = dateFns.formatDistanceStrict(
            eorzeaTime.toEarth(+crs[idx + 1].start), end, { roundingMethod: 'floor' });
        }
        return {
          start: start,
          end: end,
          duration: dateFns.formatDistanceStrict(end, start, { roundingMethod: 'floor' }),
          downtime: downtime
        };
      });
    }
  }

  update(earthTime, full = false) {
    // This function should be called whenever the underlying fish data has changed.
    // Make sure you do this BEFORE updating the display...
    let fish = this.data;
    let crs = fish.catchableRanges;
    // TODO: Even this is pretty heavy-handed. We should really only update
    // the fields which have changed... [NEEDS-OPTIMIZATION]

    this.isCatchable = fish.isCatchable(fishWatcher.fishEyesEnabled);
    this.isCaught = false
    this.isPinned = false

    // The rest requires catchable ranges.
    if (crs.length > 0) {
      // Cache the dates, they are used A LOT.
      let currStart = eorzeaTime.toEarth(+crs[0].start);
      let currEnd = eorzeaTime.toEarth(+crs[0].end);
      // NOTE: If it has one entry, it'll have 2...
      if (crs.length < 2) {
        //console.error("Expected at least 2 catchable ranges for " + fish.name);
        return;
      }
      let nextStart = eorzeaTime.toEarth(+crs[1].start);

      if (dateFns.isAfter(currStart, earthTime)) {
        // The fish is not currently available.
        this.isUpSoon = dateFns.differenceInMinutes(currStart, earthTime) < 15;
        this.availability.current.duration =
          "in " + dateFns.formatDistanceStrict(currStart, earthTime, { roundingMethod: 'floor' });
        this.availability.current.date = currStart;
      } else {
        // The fish is currently available!
        this.isUpSoon = false; // It's already up! XD
        this.availability.current.duration =
          "closes in " + dateFns.formatDistanceStrict(currEnd, earthTime, { roundingMethod: 'floor' });
        this.availability.current.date = currEnd;
      }
      this.availability.upcoming.duration =
        "in " + dateFns.formatDistanceStrict(nextStart, earthTime, { roundingMethod: 'floor' });

      this.availability.upcoming.date = nextStart;
      this.availability.upcoming.prevdate = currEnd;

      // Don't rebuild static information if we don't need to.
      if (full) {
        this.updateNextWindowData();
      }
    }

    for (let subEntry of this.intuitionEntries) {
      subEntry.update(earthTime, full);
    }

    //Every time the entry gets updated, we send the updated object to the processor.
    this.processor.ingestEntry(this)
    if (CONFIG.DB_FISH_DATA_REFRESH) {
      this.processor.ensureDatabaseState(this)
    }
  }
}

class IntuitionFishEntry extends FishEntry {
  // TODO: If we are independently tracking this fish, have IntuitionFishEntry
  // just point at the main FishEntry for that fish.

  constructor(fish, processor, intuitionForFish, count) {
    super(fish, processor);
    this.intuitionCount = count;
    this.intuitionFor = intuitionForFish;
  }
}

export class ViewModel {
  constructor(fishEntryProcessor) {

    this.processor = fishEntryProcessor;
    // Initialize everything!
    // NOTE: The fish data itself is already initialized as `Fishes`.
    // Fish entries contains those entries we want to display.
    
    // JL: In our case we want to "display" everything, since the window data 
    // we want is not kept in that original 'Fishes' object.
    this.fishEntries = {}

    // The entry being used for upcoming windows modal.
    this.upcomingWindowsEntry = null;

  }

  initialize() {



    // Share reference of fishEntries with fishWatcher.
    fishWatcher.fishEntries = this.fishEntries;

    // Finally, initialize the display.
    this.initializeDisplay();
  }

  initializeDisplay() {
    // The main HTML is actually inlined, for the most part.
    //console.time("Initialization");

    // Initialize the "last date". This is used to keep cached relative date
    // text fresh.
    this.lastDate = dateFns.getDayOfYear(Date.now());

    // The fish!
    // This is the view model's pointer to the master list of fish.
    this.fishMap = _.reduce(Fishes, (memo, fish) => {
      memo[fish.id] = fish;
      return memo;
    }, {});

    // // Subjects.
    // // These are used for RxJS to allow subscription events to changes.
    this.fishChangedSubject = new Subject();

    // // Update the table!
    this.updateDisplay(null);

    var resumeTime = null;

    // Register for changes.
    // Things we care about...
    //   - Changes in filter settings.
    //     - Should be less destructive, expect for the whole re-sorting bit...
    //   - Changes in pinned settings.
    //     - Should only require a minor re-sorting...
    //   - Changes to catchable status.
    //     - Potentially requires visibility change.
    //   - Changes to the sorting algorithm.
    //     - Requires whole resorting of list.
    // Merge all of these subjects together, annotating the reason, then buffer
    // the event so that the `updateDisplay` is not being called more than it
    // needs to be.
    // NOTE: There's still the 1s interval event timer running. It needs to be
    // deduped somehow so it's not interfering every bell (or half-bell)...
    // Technically, we can just add it to this massive subscription, and use
    // the `reason` to tell it apart... It's just, the buffering doesn't make
    // sense for it.

    const bufferedFishAvailability$ = this.fishChangedSubject.pipe(
      buffer(this.fishChangedSubject.pipe(debounceTime(100))),
      map(e => { return { fishAvailability: e } })
    );

    const updateDisplaySources$ = merge(
      bufferedFishAvailability$,);

    merge(
      interval(1000).pipe(
        filter(() => resumeTime === null),
        timestamp(),
        map(e => { return { countdown: e.timestamp } })
      ),
      updateDisplaySources$.pipe(
        buffer(updateDisplaySources$.pipe(debounceTime(250))),
        filter(x => x.length > 0),
        map(e => {
          // Combine these into a single object.
          return e.reduce((acc, curr) => {
            return Object.assign(acc, curr);
          }, {});
        })
      )
    ).subscribe(e => this.updateDisplay(e));

    // Ok, now it's safe to have FishWatcher start listening for the next bell.
    eorzeaTime.currentBellChanged.subscribe(bell => fishWatcher.updateFishes());

    //console.timeEnd("Initialization");
  }

  //JL: Some of this is dead code now given all the changes, but it works so I'm gonna leave it for now.
  // This is where the countdown lives so this is where the fishentry updates are sent from.

  updateDisplay(reason = null) {
    // This functionality used to be applyFiltersAndResort. Instead of causing
    // and outside event, we're going to ask the layout class to do the hard
    // work.

    // This function is intended to be called whenever major parts of the fish
    // data have changed. That includes filtering, sorting, and availability
    // changes.

    // The `countdown` reason is ALWAYS sent alone (due to how merge works).
    if (reason !== null &&
      'countdown' in reason) {
      // console.time('updateDisplay[countdown]');
      // We only need to update the already displayed fish. No destructive
      // changes need to be made this time.
      // The update function needs an EARTH timestamp, which we get from the
      // countdown event itself.
      let timestamp = reason.countdown;

      // Check if the EARTH DATE has changed as well. If so, we must also
      // refresh the cached relative date text!
      let currDay = dateFns.getDayOfYear(timestamp);
      let needsFullUpdate = this.lastDate != currDay;
      this.lastDate = currDay;

      _(this.fishEntries).chain().reject(entry => entry.data.alwaysAvailable).each(entry => {
        // Update the data for this entry first.
        entry.update(timestamp, needsFullUpdate);
      });



      return;
    }

    // We need a base time!
    let timestamp = Date.now();

    if (reason !== null && ('fishAvailability' in reason || 'fishEyes' in reason)) {
      // FishWatcher doesn't send a message when a fish window opens...
      // But it's important to know that one closed, since this results in new
      // availability values getting computed...
      // Either way... we'll update ALL THE FISH ENTRIES to prevent a
      // double-resort.
      _(this.fishEntries).chain().reject(entry => entry.data.alwaysAvailable).each(entry => {
        // Update the data for this entry first.
        entry.update(timestamp, true);
      });
      // Fall-through just in case filters were changed at the same time...
    }

    if ((reason === null) ||
      (reason !== null && ('filterCompletion' in reason ||
        'filterPatch' in reason ||
        'filterExtra' in reason ||
        'filterAlwaysAvailable' in reason))) {
      // Mark all existing entries as stale (or not active).
      // Anything that's not active, won't be displayed, and at the end of this
      // function, will be removed from the list, making future updates faster.
      _(this.fishEntries).each((entry) => entry.active = false);

      // Next, we'll apply the current filters to the entire list, and only
      // (re-)activate the fish that remain.
      // NOTE: We don't actually need to keep a copy of this list, thus the
      // chaining.
      // TODO: If the filter settings haven't changed, there's no reason to do
      // this!
      _(Fishes).chain()
        .each(fish => {
          this.activateEntry(fish, timestamp)
        });

    }

  }

  activateEntry(fish, earthTime) {
    // Check if there's already an entry for this fish.
    if (this.fishEntries[fish.id]) {
      // There is, so just mark it as active and return.
      this.fishEntries[fish.id].active = true;
      return;
    }

    // Otherwise, we have to create a new entry for this fish.
    this.createEntry(fish, earthTime);
  }

  createEntry(fish, earthTime) {
    let entry = new FishEntry(fish, this.processor);

    // Don't forget to activate the new entry!!!
    entry.active = true;

    // Request FishWatcher update our information, please?
    // This /should/ take care of fish which were pulled out of tracking, then
    // added back in later.
    fishWatcher.reinitRangesForFish(fish);
    // Update the display fields for this entry.
    entry.update(earthTime, true);

    // Add the new entry to the set of tracked fish entries.
    // This way, whenever display changes, we'll get checked as well.
    this.fishEntries[fish.id] = entry;

    // Check if this fish has intuition requirements.
    for (let intuitionFish of fish.intuitionFish) {
      let intuitionFishEntry = new IntuitionFishEntry(
        intuitionFish.data, this.processor, fish, intuitionFish.count);
      intuitionFishEntry.active = true;
      // Initially, FishWatcher only determined if this fish /would/ be up.
      // It doesn't necessarily compute the ranges.
      fishWatcher.reinitRangesForFish(intuitionFish.data);
      // Update the entry's display fields.
      intuitionFishEntry.update(earthTime, true);

      // Unlike normal entries, this only gets added to the parent fish.
      entry.intuitionEntries.push(intuitionFishEntry);
    }

    // Connect the catchableRangesObserver to our fishChanged subject.
    entry.subscription = fish.catchableRangesObserver.pipe(
      debounceTime(100)
    ).subscribe(r => {
      // Pass this event to the view model's fish changed subject.
      this.fishChangedSubject.next(fish.id);
    });

    return entry;
  }
};
