const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(req, res) {
    const { name, type, isPublic = false, data, parentId = 0 } = req.body;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    let filePath = '';
    if (type !== 'folder') {
      if (!data) return res.status(400).json({ error: 'Missing data' });

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

      filePath = path.join(folderPath, uuidv4());
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    }

    const newFile = await dbClient.createFile({
      name, type, isPublic, parentId, localPath: filePath, userId
    });

    res.status(201).json({
      id: newFile._id, userId, name, type, isPublic, parentId
    });
  }
}

module.exports = FilesController;
