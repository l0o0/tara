import { Addon } from "./addon";

var _Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
  Components.interfaces.nsISupports
).wrappedJSObject;
if (!_Zotero.Tara) {
  _Zotero.Tara = new Addon(_Zotero);
  _Zotero.Tara.events.onInit(_Zotero);
}
