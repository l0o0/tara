import AddonEvents from "./events";
import AddonPrefs from "./prefs";
import AddonViews from "./views";
import Utils from "./utils";

const { addonName } = require("../package.json");

// 将各子模块进行合并
// 父类Addon，用于集合各类模块，方便各类进行协同
class Addon {
  private _Zotero: any;
  public events: AddonEvents;
  public views: AddonViews;
  public prefs: AddonPrefs;
  public utils: Utils;

  constructor(Zotero) {
    this._Zotero = Zotero;
    this.events = new AddonEvents(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
    this.utils = new Utils(this);
  }
}

export { addonName, Addon };
