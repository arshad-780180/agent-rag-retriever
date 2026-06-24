// Easy Bug 11
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();