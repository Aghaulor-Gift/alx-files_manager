const sha1 = require('sha1');
const Queue = require('bull');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const userQueue = new Queue('userQueue');


class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const existingUser = await dbClient.findUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'Already exist' });

    const hashedPassword = sha1(password);
    const newUser = await dbClient.createUser(email, hashedPassword);

    await userQueue.add({
      userId: newUser.insertedId.toString()
    });

    return res.status(201).json({ id: newUser.insertedId, email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.findUserById(userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
