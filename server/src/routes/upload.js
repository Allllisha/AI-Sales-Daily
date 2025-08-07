const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // ユニークなファイル名を生成
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/m4a',
    'audio/ogg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('サポートされていないファイル形式です'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * ファイルアップロードエンドポイント
 */
router.post('/file', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ファイルがアップロードされていません'
      });
    }

    const fileInfo = {
      id: req.file.filename.split('.')[0], // 拡張子を除いたファイル名をIDとして使用
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date()
    };

    console.log('File uploaded successfully:', fileInfo);

    res.json({
      success: true,
      message: 'ファイルのアップロードが完了しました',
      file: {
        id: fileInfo.id,
        name: fileInfo.originalName,
        type: fileInfo.mimetype,
        size: fileInfo.size
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // アップロードされたファイルがある場合は削除
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'ファイルのアップロードに失敗しました',
      error: error.message
    });
  }
});

/**
 * ファイル処理エンドポイント（テキスト抽出・音声認識）
 */
router.post('/process', authMiddleware, async (req, res) => {
  try {
    const { fileId, type } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'ファイルIDが指定されていません'
      });
    }

    const uploadDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadDir);
    const targetFile = files.find(file => file.startsWith(fileId));

    if (!targetFile) {
      return res.status(404).json({
        success: false,
        message: 'ファイルが見つかりません'
      });
    }

    const filePath = path.join(uploadDir, targetFile);
    const fileExt = path.extname(targetFile).toLowerCase();
    let extractedText = '';

    // ファイル形式に応じて処理
    if (fileExt === '.txt') {
      // テキストファイルの場合
      extractedText = await fs.readFile(filePath, 'utf-8');
      
    } else if (fileExt === '.pdf') {
      // PDFファイルの場合（pdf-parseライブラリが必要）
      extractedText = 'PDF処理は準備中です。テキストファイルをご利用ください。';
      
    } else if (['.mp3', '.wav', '.m4a', '.ogg'].includes(fileExt)) {
      // 音声ファイルの場合（音声認識処理が必要）
      extractedText = '音声認識処理は準備中です。テキストファイルをご利用ください。';
      
    } else if (['.docx', '.doc'].includes(fileExt)) {
      // Word文書の場合（mammothライブラリが必要）
      extractedText = 'Word文書処理は準備中です。テキストファイルをご利用ください。';
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'サポートされていないファイル形式です'
      });
    }

    // ファイルを削除（処理完了後）
    try {
      await fs.unlink(filePath);
      console.log('Processed file deleted:', targetFile);
    } catch (error) {
      console.warn('Failed to delete processed file:', error.message);
    }

    res.json({
      success: true,
      message: 'ファイルの処理が完了しました',
      extractedText: extractedText,
      originalFileName: targetFile
    });

  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({
      success: false,
      message: 'ファイルの処理に失敗しました',
      error: error.message
    });
  }
});

module.exports = router;