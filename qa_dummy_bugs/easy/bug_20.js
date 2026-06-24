// Easy Bug 20
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();