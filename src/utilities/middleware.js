function authorizeMiddleware(req, res, next) {
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401);
        return res.send("No authorization token provided.");
    }
    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        res.status(401);
        return res.send("Invalid authorization token");
    }
    const token = tokenParts[1];
    if (accessTokenSecret === token) {
        next();
    }
    else {
        console.log("mismatch error: Requested: " + authHeader + ", expected: " + accessTokenSecret);
        res.status(401);
        return res.send("Invalid authorization token");
    }
}
export { authorizeMiddleware };
//# sourceMappingURL=middleware.js.map