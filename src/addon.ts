import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import Progress from "./modules/ui";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
    };
    progress: any;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      ztoolkit: createZToolkit(),
      progress: new Progress(),
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
