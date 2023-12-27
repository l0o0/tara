// Zip a folder 
// var { Cc: classes, Ci: interfaces, Cu: utils } = Components;
var zw = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);
var pr = { PR_RDONLY: 0x01, PR_WRONLY: 0x02, PR_RDWR: 0x04, PR_CREATE_FILE: 0x08, PR_APPEND: 0x10, PR_TRUNCATE: 0x20, PR_SYNC: 0x40, PR_EXCL: 0x80 }; //https://developer.mozilla.org/docs/PR_Open#Parameters


var dirpath = "/Users/l0o0/Zotero/tmp";
dir = FileUtils.File(dirpath);

//dir must exist, as the user selected it. but note that if dir doesnt exist zw.open throws problems
//var path = fp.file.path; //returns C:\Users\3K2KYC1\Documents\prefs\prefs

var xpi = FileUtils.File("/Users/l0o0/Zotero/tmp.zip");

zw.open(xpi, pr.PR_RDWR | pr.PR_CREATE_FILE | pr.PR_TRUNCATE); //PR_TRUNCATE overwrites if file exists //PR_CREATE_FILE creates file if it dne //PR_RDWR opens for reading and writing

//recursviely add all
var dirArr = [dir]; //adds dirs to this as it finds it
for (var i = 0; i < dirArr.length; i++) {
    Cu.reportError('adding contents of dir[' + i + ']: ' + dirArr[i].leafName + ' PATH: ' + dirArr[i].path);
    var dirEntries = dirArr[i].directoryEntries;
    while (dirEntries.hasMoreElements()) {
        var entry = dirEntries.getNext().QueryInterface(Ci.nsIFile); //entry is instance of nsiFile so here https://developer.mozilla.org/docs/XPCOM_Interface_Reference/nsIFile
        if (entry.path == xpi.path) {
            Cu.reportError('skipping entry - will not add this entry to the zip file - as this is the zip itself: "' + xpi.path + '" leafName:"' + xpi.leafName + '"');
            continue;
        }
        if (entry.isDirectory()) {
            dirArr.push(entry);
        }
        var relPath = entry.path.replace(dirArr[0].path, ''); //need relative because we need to use this for telling addEntryFile where in the zip it should create it, and because zip is a copy of the directory
        Cu.reportError('+' + relPath); //makes it relative to directory the parent dir (dir[0]) so it can succesfully populate files with same names but different folders in this parent dir, needed because recursviely going through all dirs
        var saveInZipAs = relPath.substr(1); //need to get ride of the first '\' forward slash at start otherwise it puts every file added in a folder of its own.
        saveInZipAs = saveInZipAs.replace(/\\/g, '/'); //remember MUST use forward slash (/)
        Cu.reportError('--' + saveInZipAs);
        zw.addEntryFile(saveInZipAs, Ci.nsIZipWriter.COMPRESSION_NONE, entry, false);
    }
}
zw.close()


/**
* folder is a nsFile pointing to a folder
* callback is a function that it's called after the zip is created. It has one parameter: the nsFile created
*/
function zipFolder(folder, callback) {
    // get TMP directory  
    var nsFile = Cc["@mozilla.org/file/directory_service;1"].
        getService(Ci.nsIProperties).
        get("TmpD", Ci.nsIFile);

    // Create a new file
    nsFile.append(folder.leafName + ".zip");
    nsFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);

    var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
    var zipW = new zipWriter();

    zipW.open(nsFile, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);

    addFolderContentsToZip(zipW, folder, "");

    // We don't want to block the main thread, so the zipping is done asynchronously
    // and here we get the notification that it has finished
    var observer = {
        onStartRequest: function (request, context) { },
        onStopRequest: function (request, context, status) {
            zipW.close();
            // Notify that we're done. 
            callback(nsFile);
        }
    }

    zipW.processQueue(observer, null);
}

/**
* function to add the contents of a folder recursively
* zipW a nsIZipWriter object
* folder a nsFile object pointing to a folder
* root a string defining the relative path for this folder in the zip
*/
function addFolderContentsToZip(zipW, folder, root) {
    var entries = folder.directoryEntries;
    while (entries.hasMoreElements()) {
        var entry = entries.getNext();
        entry.QueryInterface(Ci.nsIFile);
        zipW.addEntryFile(root + entry.leafName, Ci.nsIZipWriter.COMPRESSION_DEFAULT, entry, true);
        if (entry.isDirectory())
            addFolderContentsToZip(zipW, entry, root + entry.leafName + "/");
    }
}


function zipDirectory(dirPath, zipPath) {
    let entries = [];
    const dir = Zotero.File.pathToFile(dirPath);
    //recursviely add all
    const dirArr = [dir]; //adds dirs to this as it finds it
    for (let i = 0; i < dirArr.length; i++) {
        const dirEntries = dirArr[i].directoryEntries;
        while (dirEntries.hasMoreElements()) {
            const entry = dirEntries
                .getNext()
                .QueryInterface(Components.interfaces.nsIFile); //entry is instance of nsiFile so here https://developer.mozilla.org/docs/XPCOM_Interface_Reference/nsIFile

            if (entry.path == zipPath) {
                console.log(
                    "skipping entry - will not add this entry to the zip file - as this is the zip itself: " +
                    zipPath,
                );
                continue;
            }


            if (entry.isSymLink) {
                console.log("Skipping symlink " + entry.leafName);
                continue;
            }

            if (entry.leafName.startsWith('.')) {
                console.log('Skipping file ' + entry.leafName);
                continue;
            }

            if (entry.isDirectory()) {
                dirArr.push(entry);
            }
            let saveInZipAs = entry.path.substring(dirArr[0].path.length + 1);
            saveInZipAs = saveInZipAs.replace(/\\/g, "/"); //remember MUST use forward slash (/)
            console.log("Add zip entry: " + saveInZipAs);
            entries.push({ name: saveInZipAs, file: entry });
        }
    }
    return entries;
}


function zipDirectory(dirPath, zipPath) {
    const entries = [];
    const dir = Zotero.File.pathToFile(dirPath);
    //recursviely add all
    const dirArr = [dir]; //adds dirs to this as it finds it
    for (let i = 0; i < dirArr.length; i++) {
        const dirEntries = dirArr[i].directoryEntries;
        while (dirEntries.hasMoreElements()) {
            const entry = dirEntries
                .getNext()
                .QueryInterface(Components.interfaces.nsIFile); //entry is instance of nsiFile so here https://developer.mozilla.org/docs/XPCOM_Interface_Reference/nsIFile

            if (entry.path == zipPath) {
                console.log(
                    "skipping entry - will not add this entry to the zip file - as this is the zip itself: " +
                    zipPath,
                );
                continue;
            }

            if (entry.isSymLink) {
                console.log("Skipping symlink " + entry.leafName);
                continue;
            }

            if (entry.leafName.startsWith(".")) {
                console.log("Skipping file " + entry.leafName);
                continue;
            }

            if (entry.isDirectory()) {
                dirArr.push(entry);
            }
            let saveInZipAs = entry.path.substring(dirArr[0].path.length + 1);
            saveInZipAs = saveInZipAs.replace(/\\/g, "/"); //remember MUST use forward slash (/)
            console.log("--" + saveInZipAs);
            entries.push({ name: saveInZipAs, file: entry });
        }
    }

    // Skip empty directory
    if (entries.length == 0) {
        console.log("Nothing to zip!");
        return false;
    }

    const promise = new Promise((resolve, reject) => {
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
            onStartRequest: (request, context) => {
                console.log(`Start to zip folder ${dirPath}`)
            },

            onStopRequest: (request, context) => {
                try {
                    console.log(`Finish to zip folder ${dirPath} to ${zipPath}`);
                    zw.close();
                    resolve(zipPath);
                } catch (e) {
                    reject(e);
                }
            },

        }
        zw.processQueue(observer, null);
    });

    return promise;
}