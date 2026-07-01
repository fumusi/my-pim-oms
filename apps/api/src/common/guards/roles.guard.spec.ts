import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../enums/role.enum';

function mockContext(role?: Role): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('returns true when no roles metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(mockContext())).toBe(true);
  });

  it('returns true when user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(guard.canActivate(mockContext(Role.Admin))).toBe(true);
  });

  it('throws 403 when user role does not match', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(() => guard.canActivate(mockContext(Role.User))).toThrow(
      ForbiddenException,
    );
  });

  it('throws 401 when request has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(() => guard.canActivate(mockContext())).toThrow(
      UnauthorizedException,
    );
  });
});
