import express from 'express';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
const app = express();
const router = express.Router();
// Use the cors middleware to enable CORS
app.use(cors());
// Define your route using the router instance
router.get('/catalog', async (req, res) => {
    try {
        // Read the catalog.json file
        const catalogData = fs.readFileSync('./src/profiles/catalog_config.json', 'utf8');
        const catalog = JSON.parse(catalogData);
        const formattedCatalog = {};
        // Extract specific fields for featured2, featured1, and daily1 to daily6
        const keysToExtract = ['featured2', 'featured1', 'daily1', 'daily2', 'daily3', 'daily4', 'daily5', 'daily6'];
        for (const key of keysToExtract) {
            const item = catalog[key];
            if (item) {
                const itemGrant = item.itemGrants[0].split(':')[1];
                const price = item.price; // Get the price from the item
                formattedCatalog[key] = {
                    itemGrant,
                    price
                };
            }
        }
        res.json(formattedCatalog);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error fetching catalog information' });
    }
});
app.use('/', router);
// Load SSL/TLS certificates
const sslOptions = {
    key: fs.readFileSync('./src/sslcert/private.key'),
    cert: fs.readFileSync('./src/sslcert/certificate.crt') // Include CA bundle if needed
};
// Create HTTPS server
const server = https.createServer(sslOptions, app);
// Start the HTTPS server
/* server.listen(8083, () => {
  console.log('HTTPS server is running on port 8083');
}); */
export default app;
//# sourceMappingURL=webitemshop.js.map