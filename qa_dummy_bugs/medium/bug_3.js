// Medium Bug 3
Promise.reject(new Error("Unhandled promise rejection: database timeout"));
setTimeout(() => {}, 100);
// Triggering CI failure 1782363205292
