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