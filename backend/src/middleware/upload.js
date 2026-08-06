const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_ROOT, ensureUploadDirs } = require('../config/upload');

ensureUploadDirs();

function createUploader(folder) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_ROOT, folder));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });
}

const uploadProductImage = createUploader('products').single('image');
const uploadDealImage = createUploader('deals').single('image');

function uploadMediaImage(folder) {
  const allowed = ['products', 'deals', 'categories', 'hero'];
  if (!allowed.includes(folder)) {
    throw new Error(`Invalid upload folder: ${folder}`);
  }
  return createUploader(folder).single('image');
}

module.exports = {
  uploadProductImage,
  uploadDealImage,
  uploadMediaImage,
  createUploader,
};
