import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotImplementedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Contact } from './entities/contact.entity';
import { Address } from './entities/address.entity';
import { User } from '../users/entities/user.entity';
import { PriceList } from '../price-lists/entities/price-list.entity';
import { PriceListItem } from '../price-lists/entities/price-list-item.entity';
import { CustomerPriceList } from '../price-lists/entities/customer-price-list.entity';
import { CustomerStatus } from '../common/enums/customer-status.enum';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';
import type { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import type { CreateContactDto } from './dto/create-contact.dto';
import type { UpdateContactDto } from './dto/update-contact.dto';
import type { CreateAddressDto } from './dto/create-address.dto';
import type { UpdateAddressDto } from './dto/update-address.dto';

export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface MemberUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface CustomerDetail extends Omit<Customer, 'members'> {
  orderCount: number;
  members: MemberUser[];
}

export interface DeactivateResult {
  deactivated: number;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Address) private readonly addressRepo: Repository<Address>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(CustomerPriceList) private readonly cplRepo: Repository<CustomerPriceList>,
    @InjectRepository(PriceListItem) private readonly plItemRepo: Repository<PriceListItem>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: FindCustomersQueryDto): Promise<PaginatedCustomers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.customerRepo
      .createQueryBuilder('c')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (!query.status) {
      qb.andWhere('c.archivedAt IS NULL');
    } else if (query.status === 'archived') {
      qb.andWhere('c.archivedAt IS NOT NULL');
    } else {
      qb.andWhere('c.archivedAt IS NULL');
      qb.andWhere('c.status = :status', { status: query.status });
    }

    if (query.search) {
      const s = `%${query.search}%`;
      qb.andWhere(
        '(c.name ILIKE :s OR c.email ILIKE :s OR c.customerNumber ILIKE :s)',
        { s },
      );
    }

    if (query.country) {
      qb.andWhere('c.country ILIKE :country', { country: `%${query.country}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: number): Promise<CustomerDetail> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: { contacts: true, addresses: true },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    const members = await this.userRepo.find({
      where: { customerId: id },
      select: { id: true, email: true, firstName: true, lastName: true },
      order: { createdAt: 'ASC' },
    });
    return Object.assign(customer, { orderCount: 0, members });
  }

  async create(dto: CreateCustomerDto, createdBy: string): Promise<Customer> {
    try {
      return await this.dataSource.transaction(async (em) => {
        const customerNumber = await this.generateCustomerNumber(em);

        const customer = em.create(Customer, {
          customerNumber,
          name: dto.name,
          companyName: dto.companyName ?? null,
          email: dto.email,
          phoneNumber: dto.phoneNumber ?? null,
          country: dto.country,
          vatNumber: dto.vatNumber ?? null,
          status: dto.status ?? CustomerStatus.Active,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          createdBy,
          updatedBy: createdBy,
        });
        const savedCustomer = await em.save(Customer, customer);

        const hasPrimaryAddress = dto.addresses.some((a) => a.isPrimary);
        const addresses = dto.addresses.map((a, i) =>
          em.create(Address, {
            customerId: savedCustomer.id,
            street: a.street,
            houseNumber: a.houseNumber,
            postalCode: a.postalCode,
            city: a.city,
            province: a.province ?? null,
            country: a.country,
            isPrimary: hasPrimaryAddress ? (a.isPrimary ?? false) : i === 0,
          }),
        );
        savedCustomer.addresses = await em.save(Address, addresses);

        if (dto.contacts && dto.contacts.length > 0) {
          const hasPrimaryContact = dto.contacts.some((c) => c.isPrimary);
          const contacts = dto.contacts.map((c, i) =>
            em.create(Contact, {
              customerId: savedCustomer.id,
              firstName: c.firstName,
              lastName: c.lastName,
              email: c.email ?? null,
              phoneNumber: c.phoneNumber ?? null,
              isPrimary: hasPrimaryContact ? (c.isPrimary ?? false) : i === 0,
            }),
          );
          savedCustomer.contacts = await em.save(Contact, contacts);
        } else {
          savedCustomer.contacts = [];
        }

        return savedCustomer;
      });
    } catch (err: unknown) {
      const pgErr = err as { code?: string; constraint?: string };
      if (pgErr.code === '23505') {
        if (pgErr.constraint?.includes('customer_number')) {
          throw new ConflictException('Customer number collision — please retry');
        }
        throw new ConflictException('A customer with this email already exists');
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateCustomerDto, updatedBy: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    const { customerNumber: _cn, status, endDate, ...rest } = dto as Record<string, unknown>;

    Object.assign(customer, rest);

    if (endDate !== undefined) {
      customer.endDate = endDate ? new Date(endDate as string) : null;
    }

    if (status !== undefined) {
      if (status === CustomerStatus.Active && customer.endDate) {
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);
        if (new Date(customer.endDate) < todayUTC) {
          throw new BadRequestException('Cannot activate customer with a past end date');
        }
      }
      customer.status = status as CustomerStatus;
    }

    customer.updatedBy = updatedBy;
    return this.customerRepo.save(customer);
  }

  async updateStatus(id: number, status: CustomerStatus, updatedBy: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);

    if (status === CustomerStatus.Active && customer.endDate) {
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      if (new Date(customer.endDate) < todayUTC) {
        throw new BadRequestException('Cannot activate customer with a past end date');
      }
    }

    customer.status = status;
    customer.updatedBy = updatedBy;
    return this.customerRepo.save(customer);
  }

  async remove(id: number): Promise<void> {
    // TODO: block if customer has any orders (orders module not yet implemented)
    throw new NotImplementedException('Delete is blocked until order integration is complete');
  }

  async archive(id: number): Promise<Customer> {
    // TODO: block if customer has active orders (orders module not yet implemented)
    throw new NotImplementedException('Archive is blocked until order integration is complete');
  }

  async createContact(customerId: number, dto: CreateContactDto): Promise<Contact> {
    await this.findById(customerId);
    return this.dataSource.transaction(async (em) => {
      const count = await em.count(Contact, { where: { customerId } });
      if (count >= 10) {
        throw new BadRequestException('Cannot add more than 10 contacts');
      }
      if (dto.isPrimary) {
        await em.createQueryBuilder()
          .update(Contact)
          .set({ isPrimary: false })
          .where('customer_id = :customerId', { customerId })
          .execute();
      }
      const contact = em.create(Contact, {
        customerId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        phoneNumber: dto.phoneNumber ?? null,
        isPrimary: dto.isPrimary ?? false,
      });
      return em.save(Contact, contact);
    });
  }

  async updateContact(customerId: number, contactId: number, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id: contactId } });
    if (!contact || contact.customerId !== customerId) {
      throw new NotFoundException(`Contact ${contactId} not found for customer ${customerId}`);
    }
    const { isPrimary: _ignored, ...fields } = dto as Record<string, unknown>;
    Object.assign(contact, fields);
    return this.contactRepo.save(contact);
  }

  async removeContact(customerId: number, contactId: number): Promise<void> {
    const contact = await this.contactRepo.findOne({ where: { id: contactId } });
    if (!contact || contact.customerId !== customerId) {
      throw new NotFoundException(`Contact ${contactId} not found for customer ${customerId}`);
    }
    await this.contactRepo.remove(contact);
  }

  async setPrimaryContact(customerId: number, contactId: number): Promise<Contact> {
    await this.findById(customerId);
    const contact = await this.contactRepo.findOne({ where: { id: contactId } });
    if (!contact || contact.customerId !== customerId) {
      throw new NotFoundException(`Contact ${contactId} not found for customer ${customerId}`);
    }

    await this.dataSource.transaction(async (em) => {
      await em.createQueryBuilder()
        .update(Contact)
        .set({ isPrimary: false })
        .where('customer_id = :customerId', { customerId })
        .execute();
      await em.createQueryBuilder()
        .update(Contact)
        .set({ isPrimary: true })
        .where('id = :id', { id: contactId })
        .execute();
    });

    contact.isPrimary = true;
    return contact;
  }

  async createAddress(customerId: number, dto: CreateAddressDto): Promise<Address> {
    await this.findById(customerId);
    return this.dataSource.transaction(async (em) => {
      const count = await em.count(Address, { where: { customerId } });
      if (count >= 10) {
        throw new BadRequestException('Cannot add more than 10 addresses');
      }
      if (dto.isPrimary) {
        await em.createQueryBuilder()
          .update(Address)
          .set({ isPrimary: false })
          .where('customer_id = :customerId', { customerId })
          .execute();
      }
      const address = em.create(Address, {
        customerId,
        street: dto.street,
        houseNumber: dto.houseNumber,
        postalCode: dto.postalCode,
        city: dto.city,
        province: dto.province ?? null,
        country: dto.country,
        isPrimary: dto.isPrimary ?? false,
      });
      return em.save(Address, address);
    });
  }

  async updateAddress(customerId: number, addressId: number, dto: UpdateAddressDto): Promise<Address> {
    const address = await this.addressRepo.findOne({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException(`Address ${addressId} not found for customer ${customerId}`);
    }
    const { isPrimary: _ignored, ...fields } = dto as Record<string, unknown>;
    Object.assign(address, fields);
    return this.addressRepo.save(address);
  }

  async removeAddress(customerId: number, addressId: number): Promise<void> {
    const addresses = await this.addressRepo.find({ where: { customerId } });
    const target = addresses.find((a) => a.id === addressId);
    if (!target) {
      throw new NotFoundException(`Address ${addressId} not found for customer ${customerId}`);
    }
    if (addresses.length === 1) {
      throw new BadRequestException('Cannot delete the only address');
    }
    if (target.isPrimary) {
      const remaining = addresses.filter((a) => a.id !== addressId);
      remaining[0].isPrimary = true;
      await this.addressRepo.save(remaining[0]);
    }
    await this.addressRepo.remove(target);
  }

  async setPrimaryAddress(customerId: number, addressId: number): Promise<Address> {
    await this.findById(customerId);
    const address = await this.addressRepo.findOne({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException(`Address ${addressId} not found for customer ${customerId}`);
    }

    await this.dataSource.transaction(async (em) => {
      await em.createQueryBuilder()
        .update(Address)
        .set({ isPrimary: false })
        .where('customer_id = :customerId', { customerId })
        .execute();
      await em.createQueryBuilder()
        .update(Address)
        .set({ isPrimary: true })
        .where('id = :id', { id: addressId })
        .execute();
    });

    address.isPrimary = true;
    return address;
  }

  async getCustomerPriceList(customerId: number) {
    const cpl = await this.cplRepo
      .createQueryBuilder('cpl')
      .innerJoinAndSelect('cpl.priceList', 'pl')
      .where('cpl.customerId = :customerId', { customerId })
      .orderBy('cpl.assignedAt', 'DESC')
      .getOne();

    if (!cpl) return null;

    const items = await this.plItemRepo
      .createQueryBuilder('pli')
      .leftJoinAndSelect('pli.product', 'p')
      .where('pli.priceListId = :id', { id: cpl.priceListId })
      .getMany();

    return {
      id: cpl.priceList.id,
      name: cpl.priceList.name,
      status: cpl.priceList.status,
      startDate: cpl.priceList.startDate,
      endDate: cpl.priceList.endDate,
      archivedAt: cpl.priceList.archivedAt,
      assignedAt: cpl.assignedAt,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        customPrice: item.customPrice,
        discount: item.discount,
        effectivePrice:
          item.discount != null
            ? parseFloat((item.customPrice * (1 - item.discount / 100)).toFixed(4))
            : item.customPrice,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              barcode: item.product.barcode,
              basePrice: item.product.basePrice,
            }
          : null,
      })),
    };
  }

  async deactivateExpiredCustomers(): Promise<DeactivateResult> {
    const result = await this.customerRepo
      .createQueryBuilder()
      .update(Customer)
      .set({ status: CustomerStatus.Inactive })
      .where('status = :status', { status: CustomerStatus.Active })
      .andWhere('end_date IS NOT NULL')
      .andWhere('end_date <= CURRENT_DATE')
      .execute();
    return { deactivated: result.affected ?? 0 };
  }

  private async generateCustomerNumber(em: EntityManager): Promise<string> {
    const result = await em.query(`SELECT nextval('customer_number_seq') AS next`);
    const next: number = result[0].next;
    return `CUST-${String(next).padStart(4, '0')}`;
  }
}
