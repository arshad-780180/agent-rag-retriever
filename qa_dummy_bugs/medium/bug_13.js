// Medium Bug 13
Promise.reject(new Error("Unhandled promise rejection: database timeout"));
setTimeout(() => {}, 100);