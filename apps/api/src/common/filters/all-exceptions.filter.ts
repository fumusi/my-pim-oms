import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
import type { ZodError } from 'zod';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.path;
    const method = request.method;

    let statusCode: number;
    let message: string;
    const errors: Array<{ field: string; message: string }> = [];

    if (exception instanceof ZodValidationException) {
      statusCode = 400;
      message = 'Validation failed';
      const flat = (exception.getZodError() as ZodError).flatten() as {
        formErrors: string[];
        fieldErrors: Record<string, string[] | undefined>;
      };
      for (const [field, messages] of Object.entries(flat.fieldErrors)) {
        for (const msg of messages ?? []) {
          errors.push({ field, message: msg });
        }
      }
      for (const msg of flat.formErrors) {
        errors.push({ field: '_form', message: msg });
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          message = (resObj.message as string[]).join(', ');
        } else {
          message = (resObj.message as string) ?? String(res);
        }
      } else {
        message = String(res);
      }
    } else if (exception instanceof QueryFailedError) {
      const code = (exception as any).code;
      if (code === '23505') {
        statusCode = 409;
        message = 'A record with this value already exists';
      } else if (code === '23503') {
        statusCode = 409;
        message = 'Operation not permitted — referenced record not found';
      } else {
        statusCode = 500;
        message = 'Database error';
      }
    } else {
      statusCode = 500;
      message = 'Internal server error';
    }

    const logLine = `[${method}] ${path} — ${statusCode} ${message}`;
    if (statusCode >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(logLine, stack);
    } else {
      this.logger.log(logLine);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path,
    });
  }
}
