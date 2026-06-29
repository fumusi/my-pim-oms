import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
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
});
