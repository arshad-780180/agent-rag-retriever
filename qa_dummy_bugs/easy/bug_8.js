// Easy Bug 8
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();