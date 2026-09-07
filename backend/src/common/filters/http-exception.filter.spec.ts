import { AllExceptionsFilter } from './http-exception.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error-codes';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  interface MockResponse {
    status: jest.Mock;
    json: jest.Mock;
  }

  const mockResponse = (): MockResponse => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  const mockRequest = (url = '/test') => ({
    url,
  });

  const mockHost = (req: unknown, res: MockResponse): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => req,
      }),
    }) as ArgumentsHost;

  it('should handle HttpException with string response', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost(req, res));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: ERROR_CODES.VALIDATION_FAILED,
      }),
    );
  });

  it('should handle HttpException with object response', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException(
      { message: 'Not found', errorCode: 'CUSTOM_001' },
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: 'CUSTOM_001',
      }),
    );
  });

  it('should handle HttpException with array message', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException(
      { message: ['Error 1', 'Error 2'] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: ['Error 1', 'Error 2'],
      }),
    );
  });

  it('should handle non-Http exception as 500', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new Error('Unexpected error');

    filter.catch(exception, mockHost(req, res));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      }),
    );
  });

  it('should handle unknown exception as 500', () => {
    const res = mockResponse();
    const req = mockRequest();

    filter.catch('string error', mockHost(req, res));

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should map 401 status to auth error code', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException(
      'Unauthorized',
      HttpStatus.UNAUTHORIZED,
    );

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      }),
    );
  });

  it('should map 403 status to forbidden error code', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ERROR_CODES.RESOURCE_FORBIDDEN,
      }),
    );
  });

  it('should map 409 status to conflict error code', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException('Conflict', HttpStatus.CONFLICT);

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ERROR_CODES.RESOURCE_CONFLICT,
      }),
    );
  });

  it('should map 429 status to rate limit error code', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException(
      'Too many',
      HttpStatus.TOO_MANY_REQUESTS,
    );

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      }),
    );
  });

  it('should map 503 status to service unavailable', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException(
      'Unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ERROR_CODES.SERVICE_UNAVAILABLE,
      }),
    );
  });

  it('should include validation details when errors present', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException(
      { message: 'Validation failed', errors: { field: 'required' } },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { validationErrors: { field: 'required' } },
      }),
    );
  });

  it('should use default error message when message is Internal server error', () => {
    const res = mockResponse();
    const req = mockRequest();
    const exception = new HttpException(
      { statusCode: 500 },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    filter.catch(exception, mockHost(req, res));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error',
      }),
    );
  });
});
