// Easy Bug 17
function init() { throw new SyntaxError("Unexpected token '<'"); }
init();
// Triggering CI failure 1782328139994
