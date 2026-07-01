import { StockNotificationService } from './stock-notification.service';
import { Product } from '../entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { Role } from '../../common/enums/role.enum';

function makeQbMock(products: Product[] = []) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(products),
  };
  return qb;
}

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 1,
    name: { en: 'Vase' },
    barcode: 'BAR-001',
    stock: 0,
    lowStockThreshold: null,
    archivedAt: null,
    status: ProductStatus.Active,
    lastLowStockNotifiedAt: null,
    lastOutOfStockNotifiedAt: null,
    ...overrides,
  }) as Product;

const makeAdmin = (email: string): User =>
  ({ id: 1, email, role: Role.Admin, isActive: true }) as User;

describe('StockNotificationService', () => {
  let service: StockNotificationService;
  let productRepo: { createQueryBuilder: jest.Mock; save: jest.Mock };
  let userRepo: { findBy: jest.Mock };
  let mailService: {
    sendLowStockAlert: jest.Mock;
    sendOutOfStockAlert: jest.Mock;
  };
  let notificationsService: { notifyAdmins: jest.Mock };
  let qb: ReturnType<typeof makeQbMock>;

  beforeEach(() => {
    qb = makeQbMock();
    productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      save: jest.fn().mockResolvedValue([]),
    };
    userRepo = { findBy: jest.fn().mockResolvedValue([]) };
    mailService = {
      sendLowStockAlert: jest.fn().mockResolvedValue(undefined),
      sendOutOfStockAlert: jest.fn().mockResolvedValue(undefined),
    };
    notificationsService = {
      notifyAdmins: jest.fn().mockResolvedValue(undefined),
    };
    service = new StockNotificationService(
      productRepo as any,
      userRepo as any,
      mailService as any,
      notificationsService as any,
    );
  });

  describe('checkAndNotify', () => {
    it('does nothing when there are no admin users', async () => {
      userRepo.findBy.mockResolvedValue([]);

      await service.checkAndNotify();

      expect(mailService.sendLowStockAlert).not.toHaveBeenCalled();
      expect(mailService.sendOutOfStockAlert).not.toHaveBeenCalled();
    });

    it('sends low-stock alert when candidates found', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      const lowProduct = makeProduct({ id: 1, stock: 2, lowStockThreshold: 5 });
      qb.getMany
        .mockResolvedValueOnce([lowProduct]) // findLowStockCandidates
        .mockResolvedValueOnce([]); // findOutOfStockCandidates

      await service.checkAndNotify();

      expect(mailService.sendLowStockAlert).toHaveBeenCalledWith(
        ['admin@test.com'],
        [lowProduct],
      );
    });

    it('sends out-of-stock alert when candidates found', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      const outProduct = makeProduct({ id: 2, stock: 0 });
      qb.getMany
        .mockResolvedValueOnce([]) // findLowStockCandidates
        .mockResolvedValueOnce([outProduct]); // findOutOfStockCandidates

      await service.checkAndNotify();

      expect(mailService.sendOutOfStockAlert).toHaveBeenCalledWith(
        ['admin@test.com'],
        [outProduct],
      );
    });

    it('does not send low-stock alert when no candidates', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      qb.getMany.mockResolvedValue([]);

      await service.checkAndNotify();

      expect(mailService.sendLowStockAlert).not.toHaveBeenCalled();
    });

    it('does not send out-of-stock alert when no candidates', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      qb.getMany.mockResolvedValue([]);

      await service.checkAndNotify();

      expect(mailService.sendOutOfStockAlert).not.toHaveBeenCalled();
    });

    it('updates lastLowStockNotifiedAt after sending low-stock alert', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      const lowProduct = makeProduct({
        id: 1,
        stock: 2,
        lowStockThreshold: 10,
      });
      qb.getMany.mockResolvedValueOnce([lowProduct]).mockResolvedValueOnce([]);

      const before = new Date();
      await service.checkAndNotify();
      const after = new Date();

      const [saved] = productRepo.save.mock.calls[0];
      expect(saved[0].lastLowStockNotifiedAt).toBeInstanceOf(Date);
      expect(saved[0].lastLowStockNotifiedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(saved[0].lastLowStockNotifiedAt.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('updates lastOutOfStockNotifiedAt after sending out-of-stock alert', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      const outProduct = makeProduct({ id: 2, stock: 0 });
      qb.getMany.mockResolvedValueOnce([]).mockResolvedValueOnce([outProduct]);

      await service.checkAndNotify();

      const [saved] = productRepo.save.mock.calls[0];
      expect(saved[0].lastOutOfStockNotifiedAt).toBeInstanceOf(Date);
    });

    it('sends to multiple admins at once', async () => {
      userRepo.findBy.mockResolvedValue([
        makeAdmin('admin1@test.com'),
        makeAdmin('admin2@test.com'),
      ]);
      const outProduct = makeProduct({ stock: 0 });
      qb.getMany.mockResolvedValueOnce([]).mockResolvedValueOnce([outProduct]);

      await service.checkAndNotify();

      expect(mailService.sendOutOfStockAlert).toHaveBeenCalledWith(
        ['admin1@test.com', 'admin2@test.com'],
        expect.any(Array),
      );
    });

    it('builds low-stock QB with threshold and cooldown conditions', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      qb.getMany.mockResolvedValue([]);

      await service.checkAndNotify();

      const allCalls = qb.andWhere.mock.calls.map(([expr]: [string]) => expr);
      expect(
        allCalls.some((c) => c.includes('lowStockThreshold IS NOT NULL')),
      ).toBe(true);
      expect(
        allCalls.some((c) => c.includes('stock < p.lowStockThreshold')),
      ).toBe(true);
      expect(allCalls.some((c) => c.includes('lastLowStockNotifiedAt'))).toBe(
        true,
      );
    });

    it('builds out-of-stock QB with cooldown condition', async () => {
      userRepo.findBy.mockResolvedValue([makeAdmin('admin@test.com')]);
      qb.getMany.mockResolvedValue([]);

      await service.checkAndNotify();

      const allCalls = qb.andWhere.mock.calls.map(([expr]: [string]) => expr);
      expect(allCalls.some((c) => c.includes('lastOutOfStockNotifiedAt'))).toBe(
        true,
      );
    });
  });
});
