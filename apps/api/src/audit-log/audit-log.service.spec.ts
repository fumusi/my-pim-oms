import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile();

    service = module.get(AuditLogService);
  });

  describe('log', () => {
    it('saves a create action with metadata snapshot', async () => {
      const snapshot = { id: 1, name: { en: 'Test' } };

      await service.log('Product', 1, 'create', null, 'admin@test.com', {
        snapshot,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Product',
          entityId: 1,
          action: 'create',
          changedFields: null,
          performedBy: 'admin@test.com',
          metadata: { snapshot },
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('saves an update action with changedFields populated', async () => {
      const changedFields = {
        name: { old: { en: 'Old' }, new: { en: 'New' } },
        status: { old: 'active', new: 'inactive' },
      };

      await service.log(
        'Product',
        2,
        'update',
        changedFields,
        'editor@test.com',
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Product',
          entityId: 2,
          action: 'update',
          changedFields,
          performedBy: 'editor@test.com',
          metadata: null,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('saves a delete action with metadata snapshot', async () => {
      const snapshot = { id: 5, email: 'gone@example.com' };

      await service.log('Customer', 5, 'delete', null, 'admin@test.com', {
        snapshot,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Customer',
          entityId: 5,
          action: 'delete',
          changedFields: null,
          performedBy: 'admin@test.com',
          metadata: { snapshot },
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('does not throw when repo.save fails', async () => {
      repo.save.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.log('Order', 10, 'create', null, 'system'),
      ).resolves.not.toThrow();
    });
  });
});
