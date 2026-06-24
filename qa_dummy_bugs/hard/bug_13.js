// Hard Bug 13
async function fetch() { throw new Error("ECONNRESET: socket hang up"); }
fetch().then(() => {});