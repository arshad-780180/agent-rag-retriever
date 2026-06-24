// Easy Bug 1
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();