// Medium Bug 9
const obj = {};
Object.defineProperty(obj, 'prop', { value: 42, writable: false });
obj.prop = 43;