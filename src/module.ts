// 各子模块基类
class AddonModule {
  protected _Addon: any;
  constructor(parent: any) {
    // 共同引用父级，可以方便在不同子模块间进行协同
    this._Addon = parent;
  }
}

export default AddonModule;
