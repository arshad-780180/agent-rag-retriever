// Hard Bug 11
async function fetch() { throw new Error("ECONNRESET: socket hang up"); }
fetch().then(() => {});