import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
import { z } from 'zod';
import { AllExceptionsFilter } from './all-exceptions.filter';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
const mockGetRequest = jest.fn().mockReturnValue({ path: '/api/test', method: 'GET' });
const mockSwitchToHttp = jest.fn().mockReturnValue({
  getResponse: mockGetResponse,
  getRequest: mockGetRequest,
});
const host = { switchToHttp: mockSwitchToHttp } as unknown as ArgumentsHost;

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.clearAllMocks();
    mockStatus.mockReturnValue({ json: mockJson });
    mockGetResponse.mockReturnValue({ status: mockStatus });
    mockGetRequest.mockReturnValue({ url: '/api/test', method: 'GET' });
    mockSwitchToHttp.mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });

  });

  it('handles ZodValidationException with 400 and populated errors array', () => {
    const zodError = z.object({ email: z.string().email() }).safeParse({ email: 'bad' }).error!;
    const ex = new ZodValidationException(zodError);

    filter.catch(ex, host);

    expect(mockStatus).toHaveBeenCalledWith(400);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.statusCode).toBe(400);
    expect(payload.message).toBe('Validation failed');
    expect(Array.isArray(payload.errors)).toBe(true);
    expect(payload.errors.length).toBeGreaterThan(0);
    expect(payload.errors[0]).toHaveProperty('field', 'email');
    expect(payload.errors[0]).toHaveProperty('message');
  });

  it('handles HttpException with string response', () => {
    const ex = new HttpException('Not allowed', HttpStatus.FORBIDDEN);

    filter.catch(ex, host);

    expect(mockStatus).toHaveBeenCalledWith(403);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.statusCode).toBe(403);
    expect(payload.message).toBe('Not allowed');
    expect(payload.errors).toEqual([]);
  });

  it('handles HttpException with object response containing message', () => {
    const ex = new HttpException({ message: 'foo', error: 'Bad Request' }, HttpStatus.BAD_REQUEST);

    filter.catch(ex, host);

    expect(mockStatus).toHaveBeenCalledWith(400);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.message).toBe('foo');
    expect(payload.errors).toEqual([]);
  });

  it('handles QueryFailedError with code 23505 → 409', () => {
    const err = new QueryFailedError('', [], new Error());
    (err as any).code = '23505';

    filter.catch(err, host);

    expect(mockStatus).toHaveBeenCalledWith(409);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.statusCode).toBe(409);
    expect(payload.message).toBe('A record with this value already exists');
    expect(payload.errors).toEqual([]);
  });

  it('handles QueryFailedError with code 23503 → 409', () => {
    const err = new QueryFailedError('', [], new Error());
    (err as any).code = '23503';

    filter.catch(err, host);

    expect(mockStatus).toHaveBeenCalledWith(409);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.statusCode).toBe(409);
    expect(payload.message).toBe('Operation not permitted — referenced record not found');
    expect(payload.errors).toEqual([]);
  });

  it('handles unknown errors with 500 and generic message', () => {
    const err = new Error('something blew up');

    filter.catch(err, host);

    expect(mockStatus).toHaveBeenCalledWith(500);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.statusCode).toBe(500);
    expect(payload.message).toBe('Internal server error');
    expect(payload.errors).toEqual([]);
  });

  it('handles QueryFailedError with unknown DB error code → 500', () => {
    const err = new QueryFailedError('', [], new Error());
    (err as any).code = '23000';

    filter.catch(err, host);

    expect(mockStatus).toHaveBeenCalledWith(500);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.statusCode).toBe(500);
    expect(payload.message).toBe('Database error');
    expect(payload.errors).toEqual([]);
  });

  it('handles HttpException with array message field', () => {
    const ex = new HttpException(
      { message: ['email must be an email', 'name must not be empty'] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(ex, host);

    expect(mockStatus).toHaveBeenCalledWith(400);
    const payload = mockJson.mock.calls[0][0];
    expect(payload.statusCode).toBe(400);
    expect(payload.message).toBe('email must be an email, name must not be empty');
    expect(payload.errors).toEqual([]);
  });
});
