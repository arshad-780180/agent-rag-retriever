// Easy Bug 7
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();