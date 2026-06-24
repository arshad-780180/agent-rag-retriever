// Easy Bug 17
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();