import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PriceListsService } from './price-lists.service';
import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { CustomerPriceList } from './entities/customer-price-list.entity';
import { Product } from '../products/entities/product.entity';
import { PriceListStatus } from '../common/enums/price-list-status.enum';

function makeCplQbMock(result: CustomerPriceList | null = null) {
  const qb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

function makePriceList(overrides: Partial<PriceList> = {}): PriceList {
  return {
    id: 1,
    name: 'Test List',
    description: null,
    startDate: null,
    endDate: null,
    status: PriceListStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    ...overrides,
  } as PriceList;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    basePrice: 10.0,
    ...overrides,
  } as Product;
}

function makePriceListItem(overrides: Partial<PriceListItem> = {}): PriceListItem {
  return {
    id: 1,
    priceListId: 1,
    productId: 1,
    customPrice: 8.0,
    discount: null,
    ...overrides,
  } as PriceListItem;
}

function makeCustomerPriceList(priceList: PriceList): CustomerPriceList {
  return {
    customerId: 42,
    priceListId: priceList.id,
    priceList,
    assignedAt: new Date(),
    assignedBy: null,
  } as CustomerPriceList;
}

describe('PriceListsService.resolvePrice', () => {
  let service: PriceListsService;
  let cplRepo: { createQueryBuilder: jest.Mock; count: jest.Mock; findOneBy: jest.Mock };
  let itemRepo: { findOneBy: jest.Mock; createQueryBuilder: jest.Mock };
  let productRepo: { findOneBy: jest.Mock };
  let cplQb: ReturnType<typeof makeCplQbMock>;

  beforeEach(async () => {
    cplQb = makeCplQbMock();
    cplRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(cplQb),
      count: jest.fn().mockResolvedValue(0),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    itemRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };
    productRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceListsService,
        { provide: getRepositoryToken(PriceList), useValue: { findOneBy: jest.fn(), createQueryBuilder: jest.fn().mockReturnValue({ where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]), getManyAndCount: jest.fn().mockResolvedValue([[], 0]), skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis() }) } },
        { provide: getRepositoryToken(PriceListItem), useValue: itemRepo },
        { provide: getRepositoryToken(CustomerPriceList), useValue: cplRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get(PriceListsService);
  });

  it('returns source=price_list when customer has active price list and product is in it', async () => {
    const pl = makePriceList({ id: 1, name: 'VIP List', status: PriceListStatus.Active });
    const cpl = makeCustomerPriceList(pl);
    const item = makePriceListItem({ priceListId: 1, productId: 5, customPrice: 7.5 });

    cplQb.getOne.mockResolvedValue(cpl);
    itemRepo.findOneBy.mockResolvedValue(item);

    const result = await service.resolvePrice(5, 42);

    expect(result.source).toBe('price_list');
    expect(result.effectivePrice).toBe(7.5);
    expect(result.priceListName).toBe('VIP List');
  });

  it('returns source=base_price when customer has active price list but product is NOT in it', async () => {
    const pl = makePriceList({ id: 1, status: PriceListStatus.Active });
    const cpl = makeCustomerPriceList(pl);
    const product = makeProduct({ id: 5, basePrice: 20.0 });

    cplQb.getOne.mockResolvedValue(cpl);
    itemRepo.findOneBy.mockResolvedValue(null);
    productRepo.findOneBy.mockResolvedValue(product);

    const result = await service.resolvePrice(5, 42);

    expect(result.source).toBe('base_price');
    expect(result.effectivePrice).toBe(20.0);
    expect(result.priceListName).toBeUndefined();
  });

  it('returns source=base_price when customer has no active price list', async () => {
    const product = makeProduct({ id: 5, basePrice: 15.0 });

    cplQb.getOne.mockResolvedValue(null);
    productRepo.findOneBy.mockResolvedValue(product);

    const result = await service.resolvePrice(5, 42);

    expect(result.source).toBe('base_price');
    expect(result.effectivePrice).toBe(15.0);
  });

  it('throws NotFoundException when product does not exist', async () => {
    cplQb.getOne.mockResolvedValue(null);
    productRepo.findOneBy.mockResolvedValue(null);

    await expect(service.resolvePrice(999, 42)).rejects.toThrow(NotFoundException);
  });

  it('applies discount when price list item has a discount', async () => {
    const pl = makePriceList({ id: 1, name: 'Sale List', status: PriceListStatus.Active });
    const cpl = makeCustomerPriceList(pl);
    const item = makePriceListItem({ priceListId: 1, productId: 5, customPrice: 10.0, discount: 10 });

    cplQb.getOne.mockResolvedValue(cpl);
    itemRepo.findOneBy.mockResolvedValue(item);

    const result = await service.resolvePrice(5, 42);

    expect(result.source).toBe('price_list');
    expect(result.effectivePrice).toBe(9.0);
    expect(result.priceListName).toBe('Sale List');
  });
});

describe('PriceListsService.assignCustomer', () => {
  let service: PriceListsService;
  let cplRepo: { createQueryBuilder: jest.Mock; findOneBy: jest.Mock; count: jest.Mock };
  let plRepo: { findOneBy: jest.Mock };
  let cplQb: ReturnType<typeof makeCplQbMock>;
  let mockEm: {
    createQueryBuilder: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    cplQb = makeCplQbMock();
    mockEm = {
      createQueryBuilder: jest.fn().mockReturnValue(cplQb),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((_, data) => ({ ...data })),
      save: jest.fn().mockImplementation((_, entity) => Promise.resolve(entity)),
    };
    cplRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(cplQb),
      findOneBy: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };
    plRepo = {
      findOneBy: jest.fn().mockResolvedValue(makePriceList()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceListsService,
        {
          provide: getRepositoryToken(PriceList),
          useValue: plRepo,
        },
        {
          provide: getRepositoryToken(PriceListItem),
          useValue: {
            findOneBy: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        { provide: getRepositoryToken(CustomerPriceList), useValue: cplRepo },
        { provide: getRepositoryToken(Product), useValue: { findOneBy: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((...args: unknown[]) => {
              const cb = args[args.length - 1] as (em: typeof mockEm) => Promise<unknown>;
              return cb(mockEm);
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PriceListsService);
  });

  it('throws BadRequestException when customer already has an active price list', async () => {
    const pl = makePriceList({ id: 2, status: PriceListStatus.Active });
    const existingCpl = makeCustomerPriceList(pl);
    cplQb.getOne.mockResolvedValue(existingCpl);

    await expect(
      service.assignCustomer(1, { customerId: 42 }, 'admin@test.com'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when customer is already assigned to this exact price list', async () => {
    cplQb.getOne.mockResolvedValue(null);
    mockEm.findOneBy.mockResolvedValue(makeCustomerPriceList(makePriceList()));

    await expect(
      service.assignCustomer(1, { customerId: 42 }, 'admin@test.com'),
    ).rejects.toThrow(BadRequestException);
  });
});
