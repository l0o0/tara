import { fileURLToPath } from "url";

export function pathjoin(dira: string, dirb: string | string[]): string {
  if (typeof dirb == "string") {
    return PathUtils.join(dira, dirb);
  } else if (Array.isArray(dirb)) {
    if (dirb.length == 1) {
      return PathUtils.join(dira, dirb[0]);
    } else {
      return dirb.reduce((a, c) => PathUtils.join(a, c), dira);
    }
  } else {
    throw new Error("Invalid input parameters");
  }
}

export async function copyDir(dira: string, dirb: string) {
  for (const f of await IOUtils.getChildren(dira)) {
    ztoolkit.log(f);
    const destPath = PathUtils.join(dirb, PathUtils.filename(f));
    ztoolkit.log(destPath);
    const destPathFile = ztoolkit.getGlobal("Zotero").File.pathToFile(destPath);
    if (destPathFile.exists()) {
      destPathFile.permissions = 438;
      destPathFile.remove(false);
    }
    await IOUtils.copy(f, destPath);
  }
}
