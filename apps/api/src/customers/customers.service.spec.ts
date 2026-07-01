import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotImplementedException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { Contact } from './entities/contact.entity';
import { Address } from './entities/address.entity';
import { User } from '../users/entities/user.entity';
import { CustomerPriceList } from '../price-lists/entities/customer-price-list.entity';
import { CustomerStatus } from '../common/enums/customer-status.enum';
import { AuditLogService } from '../audit-log/audit-log.service';

function makeQbMock(result: [Customer[], number] = [[], 0]) {
  const qb: Record<string, jest.Mock> = {
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: result[1] }),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

const makeCustomer = (overrides: Partial<Customer> = {}): Customer =>
  ({
    id: 1,
    customerNumber: 'CUST-0001',
    name: 'Acme Corp',
    email: 'acme@example.com',
    country: 'NL',
    companyName: null,
    phoneNumber: null,
    vatNumber: null,
    status: CustomerStatus.Active,
    endDate: null,
    archivedAt: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    contacts: [],
    addresses: [],
    ...overrides,
  }) as Customer;

const makeContact = (overrides: Partial<Contact> = {}): Contact =>
  ({
    id: 1,
    customerId: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: null,
    phoneNumber: null,
    isPrimary: false,
    ...overrides,
  }) as Contact;

const makeAddress = (overrides: Partial<Address> = {}): Address =>
  ({
    id: 1,
    customerId: 1,
    street: 'Main St',
    houseNumber: '1',
    postalCode: '1234AB',
    city: 'Amsterdam',
    province: null,
    country: 'NL',
    isPrimary: false,
    ...overrides,
  }) as Address;

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let contactRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let addressRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };
  let qb: ReturnType<typeof makeQbMock>;

  beforeEach(async () => {
    qb = makeQbMock();
    customerRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    contactRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    addressRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(Contact), useValue: contactRepo },
        { provide: getRepositoryToken(Address), useValue: addressRepo },
        {
          provide: getRepositoryToken(User),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(CustomerPriceList),
          useValue: { createQueryBuilder: jest.fn(), findOneBy: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('findAll', () => {
    it('returns paginated customers', async () => {
      const customers = [makeCustomer()];
      qb.getManyAndCount.mockResolvedValue([customers, 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({ data: customers, total: 1, page: 1, limit: 20 });
    });

    it('filters archived when status=archived', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, status: 'archived' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('c.archivedAt IS NOT NULL');
    });

    it('filters by status=active with archivedAt IS NULL', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, status: 'active' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('c.archivedAt IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('c.status = :status', {
        status: 'active',
      });
    });

    it('applies search filter on name, email, customerNumber', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, search: 'acme' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(c.name ILIKE :s OR c.email ILIKE :s OR c.customerNumber ILIKE :s)',
        { s: '%acme%' },
      );
    });

    it('applies country filter', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, country: 'NL' });

      expect(qb.andWhere).toHaveBeenCalledWith('c.country ILIKE :country', {
        country: '%NL%',
      });
    });
  });

  describe('findById', () => {
    it('returns customer with relations and orderCount stub', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);

      const result = await service.findById(1);

      expect(customerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { contacts: true, addresses: true },
      });
      expect(result.orderCount).toBe(0);
    });

    it('throws NotFoundException when customer does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('generates CUST-0001 on empty table', async () => {
      const emMock = {
        query: jest.fn().mockResolvedValue([{ next: 1 }]),
        create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
        save: jest
          .fn()
          .mockImplementation((_entity, data) =>
            Promise.resolve(Array.isArray(data) ? data : { ...data, id: 1 }),
          ),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Customer>) => cb(emMock),
      );

      await service.create(
        {
          name: 'Test',
          email: 'test@example.com',
          country: 'NL',
          addresses: [
            {
              street: 'A',
              houseNumber: '1',
              postalCode: '1234',
              city: 'AMS',
              country: 'NL',
            },
          ],
        },
        'admin@example.com',
      );

      expect(emMock.create).toHaveBeenCalledWith(
        Customer,
        expect.objectContaining({ customerNumber: 'CUST-0001' }),
      );
    });

    it('auto-assigns isPrimary to first address when none specified', async () => {
      const emMock = {
        query: jest.fn().mockResolvedValue([{ next: 2 }]),
        create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
        save: jest
          .fn()
          .mockImplementation((_entity, data) =>
            Promise.resolve(Array.isArray(data) ? data : { ...data, id: 1 }),
          ),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Customer>) => cb(emMock),
      );

      await service.create(
        {
          name: 'Test',
          email: 'test@example.com',
          country: 'NL',
          addresses: [
            {
              street: 'A',
              houseNumber: '1',
              postalCode: '1234',
              city: 'AMS',
              country: 'NL',
            },
            {
              street: 'B',
              houseNumber: '2',
              postalCode: '5678',
              city: 'RTD',
              country: 'NL',
            },
          ],
        },
        'admin@example.com',
      );

      const addressSaveCall = emMock.save.mock.calls.find(
        ([entity]) => entity === Address,
      );
      expect(addressSaveCall).toBeDefined();
      const savedAddresses = addressSaveCall![1] as Address[];
      expect(savedAddresses[0].isPrimary).toBe(true);
      expect(savedAddresses[1].isPrimary).toBe(false);
    });

    it('throws ConflictException on duplicate email', async () => {
      dataSource.transaction.mockRejectedValue({ code: '23505' });

      await expect(
        service.create(
          {
            name: 'Test',
            email: 'dup@example.com',
            country: 'NL',
            addresses: [
              {
                street: 'A',
                houseNumber: '1',
                postalCode: '1234',
                city: 'AMS',
                country: 'NL',
              },
            ],
          } as any,
          'admin@example.com',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates fields and sets updatedBy', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      customerRepo.save.mockImplementation((c: Customer) => Promise.resolve(c));

      const result = await service.update(
        1,
        { name: 'New Name' },
        'admin@example.com',
      );

      expect(result.name).toBe('New Name');
      expect(result.updatedBy).toBe('admin@example.com');
    });

    it('ignores customerNumber in payload', async () => {
      const customer = makeCustomer({ customerNumber: 'CUST-0001' });
      customerRepo.findOne.mockResolvedValue(customer);
      customerRepo.save.mockImplementation((c: Customer) => Promise.resolve(c));

      await service.update(
        1,
        { customerNumber: 'CUST-9999' } as any,
        'admin@example.com',
      );

      expect(customer.customerNumber).toBe('CUST-0001');
    });

    it('throws BadRequestException when setting status Active with past endDate', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const customer = makeCustomer({
        status: CustomerStatus.Inactive,
        endDate: pastDate,
      });
      customerRepo.findOne.mockResolvedValue(customer);

      await expect(
        service.update(
          1,
          { status: CustomerStatus.Active } as any,
          'admin@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('activates a customer', async () => {
      const customer = makeCustomer({
        status: CustomerStatus.Inactive,
        endDate: null,
      });
      customerRepo.findOne.mockResolvedValue(customer);
      customerRepo.save.mockImplementation((c: Customer) => Promise.resolve(c));

      const result = await service.updateStatus(
        1,
        CustomerStatus.Active,
        'admin@example.com',
      );

      expect(result.status).toBe(CustomerStatus.Active);
      expect(result.updatedBy).toBe('admin@example.com');
    });

    it('throws BadRequestException when activating with a past endDate', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const customer = makeCustomer({
        status: CustomerStatus.Inactive,
        endDate: pastDate,
      });
      customerRepo.findOne.mockResolvedValue(customer);

      await expect(
        service.updateStatus(1, CustomerStatus.Active, 'admin@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('throws NotImplementedException', async () => {
      await expect(service.remove(1)).rejects.toThrow(NotImplementedException);
    });
  });

  describe('archive', () => {
    it('throws NotImplementedException', async () => {
      await expect(service.archive(1)).rejects.toThrow(NotImplementedException);
    });
  });

  describe('createContact', () => {
    it('saves a new contact via transaction', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const contact = makeContact();
      const emMock = {
        count: jest.fn().mockResolvedValue(0),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        }),
        create: jest.fn().mockReturnValue(contact),
        save: jest.fn().mockResolvedValue(contact),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Contact>) => cb(emMock),
      );

      const result = await service.createContact(1, {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(emMock.save).toHaveBeenCalled();
      expect(result).toBe(contact);
    });

    it('clears existing primaries in transaction when isPrimary is true', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const contact = makeContact({ isPrimary: true });
      const txQb: Record<string, jest.Mock> = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const emMock = {
        count: jest.fn().mockResolvedValue(1),
        createQueryBuilder: jest.fn().mockReturnValue(txQb),
        create: jest.fn().mockReturnValue(contact),
        save: jest.fn().mockResolvedValue(contact),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Contact>) => cb(emMock),
      );

      await service.createContact(1, {
        firstName: 'John',
        lastName: 'Doe',
        isPrimary: true,
      });

      expect(txQb.set).toHaveBeenCalledWith({ isPrimary: false });
    });

    it('throws BadRequestException when customer already has 10 contacts', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const emMock = {
        count: jest.fn().mockResolvedValue(10),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Contact>) => cb(emMock),
      );

      await expect(
        service.createContact(1, { firstName: 'Jane', lastName: 'Doe' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeContact', () => {
    it('removes contact', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const contact = makeContact({ id: 2, customerId: 1 });
      contactRepo.findOne.mockResolvedValue(contact);

      await service.removeContact(1, 2);

      expect(contactRepo.remove).toHaveBeenCalledWith(contact);
    });

    it('throws NotFoundException when contact belongs to different customer', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const contact = makeContact({ id: 2, customerId: 99 });
      contactRepo.findOne.mockResolvedValue(contact);

      await expect(service.removeContact(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateContact', () => {
    it('ignores isPrimary field in payload', async () => {
      const contact = makeContact({ id: 2, customerId: 1, isPrimary: false });
      contactRepo.findOne.mockResolvedValue(contact);
      contactRepo.save.mockImplementation((c: Contact) => Promise.resolve(c));

      const result = await service.updateContact(1, 2, {
        firstName: 'Jane',
        isPrimary: true,
      });

      expect(result.isPrimary).toBe(false);
      expect(result.firstName).toBe('Jane');
    });
  });

  describe('setPrimaryContact', () => {
    it('clears others and sets target as primary', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const contact = makeContact({ id: 2, customerId: 1 });
      contactRepo.findOne.mockResolvedValue(contact);

      const txQb: Record<string, jest.Mock> = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const emMock = { createQueryBuilder: jest.fn().mockReturnValue(txQb) };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<unknown>) => cb(emMock),
      );

      const result = await service.setPrimaryContact(1, 2);

      expect(txQb.set).toHaveBeenCalledWith({ isPrimary: false });
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('createAddress', () => {
    it('saves a new address via transaction', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const address = makeAddress();
      const emMock = {
        count: jest.fn().mockResolvedValue(0),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        }),
        create: jest.fn().mockReturnValue(address),
        save: jest.fn().mockResolvedValue(address),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Address>) => cb(emMock),
      );

      const result = await service.createAddress(1, {
        street: 'Main St',
        houseNumber: '1',
        postalCode: '1234AB',
        city: 'AMS',
        country: 'NL',
      });

      expect(emMock.save).toHaveBeenCalled();
      expect(result).toBe(address);
    });

    it('clears existing primaries in transaction when isPrimary is true', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const address = makeAddress({ isPrimary: true });
      const txQb: Record<string, jest.Mock> = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const emMock = {
        count: jest.fn().mockResolvedValue(1),
        createQueryBuilder: jest.fn().mockReturnValue(txQb),
        create: jest.fn().mockReturnValue(address),
        save: jest.fn().mockResolvedValue(address),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Address>) => cb(emMock),
      );

      await service.createAddress(1, {
        street: 'Main St',
        houseNumber: '1',
        postalCode: '1234AB',
        city: 'AMS',
        country: 'NL',
        isPrimary: true,
      });

      expect(txQb.set).toHaveBeenCalledWith({ isPrimary: false });
    });

    it('throws BadRequestException when customer already has 10 addresses', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const emMock = {
        count: jest.fn().mockResolvedValue(10),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<Address>) => cb(emMock),
      );

      await expect(
        service.createAddress(1, {
          street: 'Main St',
          houseNumber: '1',
          postalCode: '1234AB',
          city: 'AMS',
          country: 'NL',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeAddress', () => {
    it('auto-promotes remaining address when deleting primary', async () => {
      const primary = makeAddress({ id: 1, customerId: 1, isPrimary: true });
      const other = makeAddress({ id: 2, customerId: 1, isPrimary: false });
      addressRepo.find.mockResolvedValue([primary, other]);
      addressRepo.save.mockResolvedValue(other);
      addressRepo.remove.mockResolvedValue(undefined);

      await service.removeAddress(1, 1);

      expect(addressRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, isPrimary: true }),
      );
      expect(addressRepo.remove).toHaveBeenCalledWith(primary);
    });

    it('throws BadRequestException when only 1 address remains', async () => {
      const address = makeAddress({ id: 1, customerId: 1 });
      addressRepo.find.mockResolvedValue([address]);

      await expect(service.removeAddress(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateAddress', () => {
    it('ignores isPrimary field in payload', async () => {
      const address = makeAddress({ id: 2, customerId: 1, isPrimary: false });
      addressRepo.findOne.mockResolvedValue(address);
      addressRepo.save.mockImplementation((a: Address) => Promise.resolve(a));

      const result = await service.updateAddress(1, 2, {
        city: 'Rotterdam',
        isPrimary: true,
      });

      expect(result.isPrimary).toBe(false);
      expect(result.city).toBe('Rotterdam');
    });
  });

  describe('setPrimaryAddress', () => {
    it('clears others and sets target as primary', async () => {
      const customer = makeCustomer();
      customerRepo.findOne.mockResolvedValue(customer);
      const address = makeAddress({ id: 2, customerId: 1 });
      addressRepo.findOne.mockResolvedValue(address);

      const txQb: Record<string, jest.Mock> = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const emMock = { createQueryBuilder: jest.fn().mockReturnValue(txQb) };
      dataSource.transaction.mockImplementation(
        (cb: (em: typeof emMock) => Promise<unknown>) => cb(emMock),
      );

      const result = await service.setPrimaryAddress(1, 2);

      expect(txQb.set).toHaveBeenCalledWith({ isPrimary: false });
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('deactivateExpiredCustomers', () => {
    it('returns deactivated count', async () => {
      const updateQb: Record<string, jest.Mock> = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      customerRepo.createQueryBuilder.mockReturnValue(updateQb);

      const result = await service.deactivateExpiredCustomers();

      expect(result).toEqual({ deactivated: 3 });
    });

    it('returns 0 when no customers match', async () => {
      const updateQb: Record<string, jest.Mock> = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      customerRepo.createQueryBuilder.mockReturnValue(updateQb);

      const result = await service.deactivateExpiredCustomers();

      expect(result).toEqual({ deactivated: 0 });
    });
  });
});
