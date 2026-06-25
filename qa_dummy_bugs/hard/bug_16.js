// Hard Bug 16
async function fetch() { throw new Error("ECONNRESET: socket hang up"); }
fetch().then(() => {});
// Triggering CI failure 1782362803494
