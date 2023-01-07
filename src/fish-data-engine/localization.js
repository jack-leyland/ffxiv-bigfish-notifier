/**
 * Source from Carbuncle Plushy's ff14-fish-tracker-app.
 *
 * Edits to this file include mainly switching to ESM and removing some browser
 * related logic and the monkeypatch for
 * 'date-fns/locale/en-US/_lib/formatRelative'.
 *
 * Remains to be seen wether any of this localization stuff is really needed at
 * all. In reality, we probably only need the fish ID, and name localization
 * logic can be implemented specifically for the notifier.
 *
 * Original project: https://github.com/icykoneko/ff14-fish-tracker-app/
 */



import _ from 'underscore'
import rxjs from "rxjs"

const LANGUAGES = {
  English: "_en",
  Japanese: "_ja",
  German: "_de",
  French: "_fr",
  Korean: "_ko"
};

export default class LocalizationHelper {

  constructor() {
    // Default to English (_en).
    this.language_suffix = LANGUAGES.English;
    this.languageChanged = new rxjs.BehaviorSubject(this.language_suffix);
  }

  getLocalizedProperty(obj, name) {
    return obj[name + this.language_suffix];
  }

  getLocalizedDataObject(obj) {
    // This function creates a /clone/ of the object, substituting all i18n
    // fields with their specific language.
    var tmp = _(obj).chain()
      .pairs()
      .partition((x) => _(LANGUAGES).any((l) => x[0].endsWith(l)))
      .value();
    return _(tmp[0]).chain()
      .filter((x) => x[0].endsWith(this.language_suffix))
      .map((x) => [x[0].slice(0, this.language_suffix.length), x[1]])
      .object()
      .extend(_(tmp[1].object()))
      .value();
  }

  setLanguage(lang) {
    if (_(LANGUAGES).chain().values().contains("_" + lang).value()) {
      this.language_suffix = "_" + lang;
      this.languageChanged.next(this.language_suffix);
    } else {
      console.error("Invalid language choice:", lang);
    }
  }

  getLanguage() {
    return this.language_suffix.slice(1);
  }
}

let localizationHelper = new LocalizationHelper();
export let __p = _.bind(localizationHelper.getLocalizedProperty, localizationHelper);

