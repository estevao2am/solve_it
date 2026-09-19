import { UnsupportedMediaTypeException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import multer from 'multer';

// Adicionado 'application/pdf' à lista
const allowedMimes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

export const multerConfig: MulterOptions = {
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB
  },

  fileFilter: (_req, file, cb) => {
    console.log('[multer] recebendo arquivo:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new UnsupportedMediaTypeException(
          'Formato de arquivo inválido. Use apenas JPG, JPEG, PNG ou PDF.',
        ),
        false,
      );
    }
  },
};
