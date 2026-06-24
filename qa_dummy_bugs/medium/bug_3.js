// Medium Bug 3
Promise.reject(new Error("Unhandled promise rejection: database timeout"));
setTimeout(() => {}, 100);