function loginUser(req, res) {
    // BUG: Entering an endless recursive loop if session fails
    if (!req.session) {
        return loginUser(req, res);
    }
    
    return res.status(200).send("Logged in");
}

module.exports = { loginUser };

// Triggering CI failure 1782324404756

// Triggering CI failure 1782324906655

// Triggering CI failure 1782324917204

// Triggering CI failure 1782325276931

// Triggering CI failure 1782325541046
