import { Addon } from "./addon";
import AddonModule from "./module";
const { addonRef } = require("../package.json");

class AddonViews extends AddonModule {
  // You can store some element in the object attributes
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
    var _window: Window = _Zotero.getMainWindow();
    var tool_button = _window.document.createElement("toolbarbutton");
    var menupopup = _window.document.createElement("menupopup");
    var create_menu = _window.document.createElement("menuitem");
    var export_menu = _window.document.createElement("menuitem");
    var restore_menu = _window.document.createElement("menuitem");

    const createLabel = this._Addon.locale.getString("toolbar.create");
    const exportLabel = this._Addon.locale.getString("toolbar.export");
    const restoreLabel = this._Addon.locale.getString("toolbar.restore");

    create_menu.setAttribute("id", "zotero-tb-tara-create-backup");
    create_menu.setAttribute("label", createLabel);
    create_menu.setAttribute("class", "menuitem-iconic");
    create_menu.setAttribute("style", "list-style-image: url('chrome://tara/skin/create_icon.png');");
    create_menu.setAttribute("oncommand", "Zotero.Tara.utils.createBackupAsAttachment();");

    export_menu.setAttribute("id", "zotero-tb-tara-export-backup");
    export_menu.setAttribute("label", exportLabel);
    export_menu.setAttribute("class", "menuitem-iconic");
    export_menu.setAttribute("style", "list-style-image: url('chrome://tara/skin/export_icon.png');");
    export_menu.setAttribute("oncommand", "Zotero.Tara.utils.createBackupZIP();");

    restore_menu.setAttribute("id", "zotero-tb-tara-restore-backup");
    restore_menu.setAttribute("label", restoreLabel);
    restore_menu.setAttribute("class", "menuitem-iconic");
    restore_menu.setAttribute("style", "list-style-image: url('chrome://tara/skin/restore_icon.png');");
    restore_menu.setAttribute("oncommand", "alert('Restore');");

    menupopup.appendChild(create_menu);
    menupopup.appendChild(export_menu);
    menupopup.appendChild(restore_menu);

    tool_button.id = "zotero-tb-tara";
    tool_button.setAttribute("type", "menu");
    tool_button.className = "zotero-tb-button";
    tool_button.style["list-style-image"] = 
      "url('chrome://tara/skin/tara_icon.png')";
    tool_button.appendChild(menupopup);
    _window.document.querySelector("#zotero-collections-toolbar").appendChild(tool_button);
  }

  // Remove UI element when remove addon
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
