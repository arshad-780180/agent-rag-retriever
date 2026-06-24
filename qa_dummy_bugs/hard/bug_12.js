// Hard Bug 12
setTimeout(() => { throw new Error("Segmentation fault (core dumped)"); }, 50);