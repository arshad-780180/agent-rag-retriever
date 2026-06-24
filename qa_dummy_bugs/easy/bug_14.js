// Easy Bug 14
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();