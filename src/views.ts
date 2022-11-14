import { Addon } from "./addon";
import AddonModule from "./module";
const { addonRef } = require("../package.json");

class AddonViews extends AddonModule {
  // You can store some element in the object attributes
  private testButton: XUL.Button;
  private progressWindowIcon: object;

  constructor(parent: Addon) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: `chrome://${addonRef}/skin/favicon.png`,
    };
  }

  public initViews(_Zotero) {
    // You can init the UI elements that
    // cannot be initialized with overlay.xul
    console.log("Initializing UI");
    const _window: Window = _Zotero.getMainWindow();
    const button = _window.document.createElement("toolbarbutton");
    button.id = "zotero-tb-tara";
    button.setAttribute("type", "menu");
    button.className = "zotero-tb-button";
    button.style["list-style-image"] = 
      "url('chrome://tara/skin/tara_icon.png')";
    _window.document.querySelector("#zotero-collections-toolbar").appendChild(button);
  }

  public unInitViews(_Zotero) {
    console.log("Uninitializing UI");
    const _window: Window = _Zotero.getMainWindow();
    _window.document
      .querySelector("#zotero-tb-tara")
      ?.remove();
  }

  public showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000
  ) {
    // A simple wrapper of the Zotero ProgressWindow
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
  }
}

export default AddonViews;
