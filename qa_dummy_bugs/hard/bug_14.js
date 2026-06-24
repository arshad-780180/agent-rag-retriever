// Hard Bug 14
setTimeout(() => { throw new Error("Segmentation fault (core dumped)"); }, 50);