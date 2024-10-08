//Sevrer side authentication functions
const { PrivyClient } = require("@privy-io/server-auth");

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

module.exports = {
    authenticate: async (req, res, next) => {
      const authToken = req.headers.authorization;
      if (!authToken) {
        return res.status(401).send('Unauthorized');
      }
  
      try {
        const verifiedClaims = await privy.verifyAuthToken(authToken);
        req.user = verifiedClaims;
  
        const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
        req.user.isAdmin = adminIds.includes(verifiedClaims.userId);
  
        next();
      } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).send('Unauthorized');
      }
    },
  
    adminAuth: (req, res, next) => {
      if (req.user.isAdmin) {
        return next();
      } else {
        return res.status(403).send('Forbidden');
      }
    }
  };
  