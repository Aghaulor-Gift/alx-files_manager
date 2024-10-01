// controllers/AuthController.js
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  // POST /connect
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization || '';
    const base64Credentials = authHeader.split(' ')[1] || '';
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Hash the password with SHA1
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    // Find user in database by email and hashed password
    const user = await dbClient.collection('users').findOne({ email, password: hashedPassword });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a token
    const token = uuidv4();
    const key = `auth_${token}`;

    // Store user ID in Redis for 24 hours
    await redisClient.set(key, user._id.toString(), 86400);

    return res.status(200).json({ token });
  }

  // GET /disconnect
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Remove the token from Redis
    await redisClient.del(`auth_${token}`);

    return res.status(204).send();
  }
}

export default AuthController;
