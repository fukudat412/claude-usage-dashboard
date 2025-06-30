/**
 * 統一エラーハンドリングミドルウェア
 */

import { Request, Response, NextFunction } from 'express';
import { APP_CONFIG } from '../config/paths';

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 非同期エラーハンドリングラッパー
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404エラーハンドラー
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

/**
 * グローバルエラーハンドラー
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  let error = { ...err };
  error.message = err.message;

  // ログ出力
  if (APP_CONFIG.logLevel === 'debug' || err.statusCode >= 500) {
    console.error(`Error ${err.statusCode || 500}: ${err.message}`);
    if (APP_CONFIG.logLevel === 'debug') {
      console.error(err.stack);
    }
  }

  // エラータイプ別処理
  if (err.code === 'ENOENT') {
    error = new AppError('File not found', 404, 'FILE_NOT_FOUND');
  } else if (err.code === 'EACCES') {
    error = new AppError('Access denied', 403, 'ACCESS_DENIED');
  } else if (err.name === 'ValidationError') {
    error = new AppError('Validation Error', 400, 'VALIDATION_ERROR');
  } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON', 400, 'INVALID_JSON');
  }

  // デフォルトエラー
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = 'Internal Server Error';
    error.code = 'INTERNAL_ERROR';
  }

  // エラーレスポンス
  const response: any = {
    error: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  };

  // 開発環境でのみスタックトレースを含める
  if (APP_CONFIG.logLevel === 'debug' && error.statusCode < 500) {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

/**
 * セキュリティバリデーション
 */
export const validateFilePath = (filePath: string): boolean => {
  if (!filePath || typeof filePath !== 'string') {
    throw new AppError('Valid file path is required', 400, 'INVALID_FILE_PATH');
  }

  // 危険な文字列をチェック
  if (filePath.includes('..') || filePath.includes('~')) {
    throw new AppError('Invalid file path', 400, 'UNSAFE_FILE_PATH');
  }

  return true;
};