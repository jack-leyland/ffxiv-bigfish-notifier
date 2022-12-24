import {interval, timestamp, map, distinctUntilChanged, tap, share} from "rxjs"
import dateFns from "./dateFns/main.js";

export const EARTH_TO_EORZEA = 3600 / 175;
export const EORZEA_TO_EARTH = 1 / EARTH_TO_EORZEA;
export const MS_IN_AN_HOUR = 60 * 60 * 1000;
export const MS_IN_A_DAY = 24 * MS_IN_AN_HOUR;

class EorzeaTime {
  constructor() {
    console.log("Constructing eorzea time")
    this.currentBellChanged = interval(0.75 * EARTH_TO_EORZEA /* ms */).pipe(
      timestamp(),
      map(v => dateFns.utc.getHours(this.toEorzea(v.timestamp))),
      distinctUntilChanged(),
      tap(v => console.log("Current bell is now:", v)),
      share()
    );
  }

  getCurrentEorzeaDate() {
    return this.toEorzea(Date.now());
  }

  toEorzea(earthDate) {
    return +earthDate * EARTH_TO_EORZEA;
  }

  toEarth(eorzeaDate) {
    return Math.ceil(+eorzeaDate * EORZEA_TO_EARTH);
  }

  zawarudo(muda, ctx) {
    // Really?
    let origDateNow = Date.now;
    let currDateTime = origDateNow();
    Date.now = () => currDateTime;
    console.info("ザ・ワールド");
    return new Promise(resolve => {
      // Counting on you to not screw us up...
      muda(resolve, ctx);
    }).then(() => {
      console.info("%s have passed!",
        dateFns.formatDistanceStrict(currDateTime, origDateNow(), { roundingMethod: 'floor' }));
      Date.now = origDateNow;
    });
  }
}

export const eorzeaTime = new EorzeaTime()