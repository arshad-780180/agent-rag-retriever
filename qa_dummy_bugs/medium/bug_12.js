// Medium Bug 12
Promise.reject(new Error("Unhandled promise rejection: database timeout"));
setTimeout(() => {}, 100);