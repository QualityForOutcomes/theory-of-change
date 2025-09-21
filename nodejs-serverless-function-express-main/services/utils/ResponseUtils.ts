import type { VercelResponse } from '@vercel/node';
import type { ApiResponse } from '../entities/ApiResponse';

export class ResponseUtils {
  static success(data: any, message = 'Success', statusCode = 200): ApiResponse {
    return {
      success: true,
      message,
      data,
      statusCode
    };
  }

  static error(message: string, statusCode = 500, details?: any): ApiResponse {
    return {
      success: false,
      message,
      error: details,
      statusCode
    };
  }

  static send(res: VercelResponse, response: ApiResponse) {
    return res.status(response.statusCode).json(response);
  }
}