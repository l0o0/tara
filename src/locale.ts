import { Addon } from "./addon";
import AddonModule from "./module";



class Locale extends AddonModule {
    private stringBundle: any;
    constructor(parent: Addon) {
        super(parent);
        this.stringBundle = Components.classes['@mozilla.org/intl/stringbundle;1']
            .getService(Components.interfaces.nsIStringBundleService)
            .createBundle('chrome://tara/locale/tara.properties');
    }

    public getString(local: string): string {
        return this.stringBundle.GetStringFromName(local);
    }
}

export default Locale;