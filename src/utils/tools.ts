import { getPref, setPref } from "./prefs";

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

export async function copyDirectory(dira: string, dirb: string) {
  for (const f of await IOUtils.getChildren(dira)) {
    const destPath = PathUtils.join(dirb, PathUtils.filename(f));
    ztoolkit.log(f + " -> " + destPath);
    const destPathFile = ztoolkit.getGlobal("Zotero").File.pathToFile(destPath);
    if (destPathFile.exists()) {
      destPathFile.permissions = 438;
      destPathFile.remove(false);
    }
    // Can use a recursive way to copy
    const sourceFile = ztoolkit.getGlobal("Zotero").File.pathToFile(f);
    if (sourceFile.isDirectory()) continue;
    await IOUtils.copy(f, destPath);
  }
}

// Sometime folders have many files will return Error when using Zotero.File.remove or IOUtils.remove
// So this code is to delete the files one by one, without casuing the error.
// This happens in Windows, not found in Unix
export function removeDirectory(dir: string | nsIFile) {
  if (typeof dir == "string") {
    dir = Zotero.File.pathToFile(dir);
  }
  const dirEntries = dir.directoryEntries;
  while (dirEntries.hasMoreElements()) {
    // @ts-ignore
    const entry = dirEntries
      .getNext()
      .QueryInterface(Components.interfaces.nsIFile);
    ztoolkit.log("try to remove folder: " + entry.path);
    if (entry.exists()) entry.permissions = 511;
    if (entry.isDirectory()) {
      removeDirectory(entry);
    } else {
      entry.remove(false);
    }
    ztoolkit.log("Deleting " + entry.path);
  }
  dir.remove(false);
}

/**
 * @param {String} dirPath - Directory containing files to add to ZIP
 * @param {String} zipPath - ZIP file to create
 * @return {Promise}
 */
export function zipDirectory(
  dirPath: string,
  zipPath: string,
): Promise<string> | boolean {
  const entries: { name: string; file: any }[] = [];
  const dir = Zotero.File.pathToFile(dirPath);
  //recursviely add all
  const dirArr = [dir]; //adds dirs to this as it finds it
  for (let i = 0; i < dirArr.length; i++) {
    const dirEntries = dirArr[i].directoryEntries;
    while (dirEntries.hasMoreElements()) {
      // @ts-ignore
      const entry = dirEntries
        .getNext()
        .QueryInterface(Components.interfaces.nsIFile); //entry is instance of nsiFile so here https://developer.mozilla.org/docs/XPCOM_Interface_Reference/nsIFile

      if (entry.path == zipPath) {
        ztoolkit.log(
          "skipping entry - will not add this entry to the zip file - as this is the zip itself: " +
            zipPath,
        );
        continue;
      }

      // @ts-ignore
      if (entry.isSymLink) {
        ztoolkit.log("Skipping symlink " + entry.leafName);
        continue;
      }

      if (entry.leafName.startsWith(".")) {
        ztoolkit.log("Skipping file " + entry.leafName);
        continue;
      }

      if (entry.isDirectory()) {
        dirArr.push(entry);
      }
      let saveInZipAs = entry.path.substring(dirArr[0].path.length + 1);
      saveInZipAs = saveInZipAs.replace(/\\/g, "/"); //remember MUST use forward slash (/)
      ztoolkit.log("Add zip entry: " + saveInZipAs);
      entries.push({ name: saveInZipAs, file: entry });
    }
  }

  // Skip empty directory
  if (entries.length == 0) {
    ztoolkit.log("Nothing to zip!");
    return false;
  }

  const promise: any = new Promise((resolve, reject) => {
    // @ts-ignore
    const zw = Components.classes["@mozilla.org/zipwriter;1"].createInstance(
      Components.interfaces.nsIZipWriter,
    );
    zw.open(Zotero.File.pathToFile(zipPath), 0x04 | 0x08 | 0x20); // open rw, create, truncate
    entries.map((e) => {
      zw.addEntryFile(
        e.name,
        Components.interfaces.nsIZipWriter.COMPRESSION_NONE,
        e.file,
        true,
      );
    });

    const observer = {
      onStartRequest: (request: any, context: any) => {
        ztoolkit.log(`Start to zip folder ${dirPath}`);
      },

      onStopRequest: (request: any, context: any) => {
        try {
          ztoolkit.log(`Finish to zip folder ${dirPath} to ${zipPath}`);
          zw.close();
          resolve(zipPath);
        } catch (e) {
          reject(e);
        }
      },
    };
    zw.processQueue(observer, null);
  });

  return promise;
}

export async function unzipToTemporaryDir(filename: string, tmpDir: string) {
  ztoolkit.log(tmpDir, filename);
  // Windows 有时不生成临时目录
  await IOUtils.makeDirectory(PathUtils.parent(tmpDir)!);
  await IOUtils.makeDirectory(tmpDir);
  const zipFile = Zotero.File.pathToFile(filename);
  // @ts-ignore
  const zipReader = Components.classes[
    "@mozilla.org/libjar/zip-reader;1"
  ].createInstance(Components.interfaces.nsIZipReader);
  zipReader.open(zipFile);
  // Extract files
  const entries = zipReader.findEntries("*");
  const subfolders = new Set<string>();
  const entryFiles: any = {};
  while (entries.hasMore()) {
    const entry = entries.getNext();
    // Unix Mac Windows, path seperator.
    const pathParts = entry.split(/[/\\]/);
    if (pathParts.length > 1)
      subfolders.add(pathjoin(tmpDir, pathParts.slice(0, -1)));
    if (entry.endsWith("/") || entry.endsWith("\\")) {
      continue;
    }
    entryFiles[entry] = pathjoin(tmpDir, pathParts);
  }
  for (const e of subfolders) {
    ztoolkit.log("Create subfolder: " + e);
    await IOUtils.makeDirectory(e, { ignoreExisting: true });
    ztoolkit.log(`${await IOUtils.exists(e)}`);
  }

  Object.keys(entryFiles).forEach((e) => {
    ztoolkit.log(e, entryFiles[e]);
    zipReader.extract(e, Zotero.File.pathToFile(entryFiles[e]));
  });

  zipReader.close();
}

// Find Tara backup item in library.
export async function findBackupItem(): Promise<number | false> {
  let itemID = getPref("itemID") as number | undefined;
  if (itemID) {
    return itemID;
  } else {
    const s = new Zotero.Search();
    s.addCondition("title", "is", "Tara_Backup");
    const itemIDs = await s.search();
    if (itemIDs.length > 0) {
      setPref("itemID", itemIDs[0]); // Update default itemID value.
      return itemIDs[0];
    } else {
      return false;
    }
  }
}
