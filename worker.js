const Queue = require('bull');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs').promises;
const { ObjectId } = require('mongodb');
const dbClient = require('./utils/db');

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

async function generateThumbnail(path, width) {
  const thumbnail = await imageThumbnail(path, { width });
  const thumbnailPath = `${path}_${width}`;
  await fs.writeFile(thumbnailPath, thumbnail);
}

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;
  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.findFileById(fileId);
  if (!file || file.userId.toString() !== userId) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  const thumbnailPromises = sizes.map(size => generateThumbnail(file.localPath, size));
  await Promise.all(thumbnailPromises);
});

userQueue.process(async (job) => {
  const { userId } = job.data;
  if (!userId) throw new Error('Missing userId');

  const user = await dbClient.findUserById(userId);
  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
});
