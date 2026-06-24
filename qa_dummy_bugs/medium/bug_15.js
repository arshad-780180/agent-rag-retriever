// Medium Bug 15
const obj = {};
Object.defineProperty(obj, 'prop', { value: 42, writable: false });
obj.prop = 43;