// Medium Bug 7
Promise.reject(new Error("Unhandled promise rejection: database timeout"));
setTimeout(() => {}, 100);