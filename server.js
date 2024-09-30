// server.js
import express from 'express';
import { redisClient } from './utils/redis.js';
import dbClient from './utils/db.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
