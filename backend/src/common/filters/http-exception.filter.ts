import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  ErrorCode,
} from '../constants/error-codes';

interface ErrorResponse {
  statusCode: number;
  error: string;
  errorCode: string;
  message: string | string[];
  timestamp: string;
  path: string;
  details?: Record<string, any>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let details: Record<string, any> | undefined;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, any>;

        // Use custom error code if provided
        if (responseObj.errorCode) {
          errorCode = responseObj.errorCode;
        } else {
          // Map HTTP status to error code
          errorCode = this.getErrorCodeFromStatus(status);
        }

        // Get message from response
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message;
        } else if (responseObj.message) {
          message = responseObj.message;
        } else if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
        }

        // Get validation details if present
        if (responseObj.errors) {
          details = { validationErrors: responseObj.errors };
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.getErrorCodeFromStatus(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
    }

    // Get error message from error code if message is default
    if (message === 'Internal server error' && errorCode in ERROR_MESSAGES) {
      message = ERROR_MESSAGES[errorCode as ErrorCode];
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      error: HttpStatus[status],
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.AUTH_INVALID_CREDENTIALS;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.RESOURCE_FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.RESOURCE_CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ERROR_CODES.RATE_LIMIT_EXCEEDED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ERROR_CODES.SERVICE_UNAVAILABLE;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
