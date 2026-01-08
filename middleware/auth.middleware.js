function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

function isRole(role) {
    return (req, res, next) => {
        if (req.session.user && req.session.user.role === role) {
            return next();
        }
        res.redirect("/login?error=unauthorized");
    }; // Redirect to login if role doesn't match);
}

function isNotAuthenticated(req, res, next) {
    if (req.session.user) {
        return res.redirect('/');
    }
    next();
}

module.exports = {
    isAuthenticated,
    isRole,
    isNotAuthenticated
};
