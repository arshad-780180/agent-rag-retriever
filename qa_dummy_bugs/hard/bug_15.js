// Hard Bug 15
async function fetch() { throw new Error("ECONNRESET: socket hang up"); }
fetch().then(() => {});