import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { CustomerPriceList } from './entities/customer-price-list.entity';
import { Product } from '../products/entities/product.entity';
import { PriceListStatus } from '../common/enums/price-list-status.enum';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { FindPriceListsQueryDto } from './dto/find-price-lists-query.dto';
import { CreatePriceListItemDto } from './dto/create-price-list-item.dto';
import { UpdatePriceListItemDto } from './dto/update-price-list-item.dto';
import { BulkAddItemsDto } from './dto/bulk-add-items.dto';
import { AssignCustomerDto } from './dto/assign-customer.dto';

@Injectable()
export class PriceListsService {
  constructor(
    @InjectRepository(PriceList)
    private readonly plRepo: Repository<PriceList>,
    @InjectRepository(PriceListItem)
    private readonly itemRepo: Repository<PriceListItem>,
    @InjectRepository(CustomerPriceList)
    private readonly cplRepo: Repository<CustomerPriceList>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    query: FindPriceListsQueryDto,
  ): Promise<{ data: PriceList[]; total: number; page: number; limit: number }> {
    const qb = this.plRepo.createQueryBuilder('pl');

    if (query.archived === true) {
      qb.where('pl.archivedAt IS NOT NULL');
    } else {
      qb.where('pl.archivedAt IS NULL');
    }

    if (query.search) {
      qb.andWhere('pl.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.status) {
      qb.andWhere('pl.status = :status', { status: query.status });
    }

    if (query.activeNow) {
      qb.andWhere('pl.status = :activeStatus', { activeStatus: PriceListStatus.Active });
      qb.andWhere('(pl.start_date IS NULL OR pl.start_date <= CURRENT_DATE)');
      qb.andWhere('(pl.end_date IS NULL OR pl.end_date >= CURRENT_DATE)');
    }

    qb.orderBy('pl.createdAt', 'DESC');
    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(
    id: number,
  ): Promise<PriceList & { items: PriceListItem[]; customerCount: number }> {
    const priceList = await this.plRepo.findOneBy({ id });

    if (!priceList) {
      throw new NotFoundException(`Price list ${id} not found`);
    }

    const items = await this.itemRepo
      .createQueryBuilder('pli')
      .leftJoinAndSelect('pli.product', 'p')
      .where('pli.priceListId = :id', { id })
      .getMany();

    const customerCount = await this.cplRepo.count({ where: { priceListId: id } });

    return { ...priceList, items, customerCount };
  }

  async create(dto: CreatePriceListDto, createdBy: string): Promise<PriceList> {
    const priceList = this.plRepo.create({ ...dto, createdBy });
    return this.plRepo.save(priceList);
  }

  async update(
    id: number,
    dto: UpdatePriceListDto,
    updatedBy: string,
  ): Promise<PriceList> {
    const priceList = await this.plRepo.findOneBy({ id });
    if (!priceList) {
      throw new NotFoundException(`Price list ${id} not found`);
    }

    if (dto.name !== undefined) priceList.name = dto.name;
    if (dto.description !== undefined) priceList.description = dto.description ?? null;
    if (dto.startDate !== undefined) priceList.startDate = dto.startDate ?? null;
    if (dto.endDate !== undefined) priceList.endDate = dto.endDate ?? null;
    if (dto.status !== undefined) priceList.status = dto.status;

    priceList.updatedBy = updatedBy;
    return this.plRepo.save(priceList);
  }

  async updateStatus(
    id: number,
    status: PriceListStatus,
    updatedBy: string,
  ): Promise<PriceList> {
    const priceList = await this.plRepo.findOneBy({ id });
    if (!priceList) {
      throw new NotFoundException(`Price list ${id} not found`);
    }
    priceList.status = status;
    priceList.updatedBy = updatedBy;
    return this.plRepo.save(priceList);
  }

  async delete(id: number): Promise<void> {
    const priceList = await this.plRepo.findOneBy({ id });
    if (!priceList) {
      throw new NotFoundException(`Price list ${id} not found`);
    }
    const count = await this.cplRepo.count({ where: { priceListId: id } });
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete price list assigned to ${count} customer(s)`,
      );
    }
    await this.plRepo.remove(priceList);
  }

  async archive(id: number, updatedBy: string): Promise<void> {
    const priceList = await this.plRepo.findOneBy({ id });
    if (!priceList) {
      throw new NotFoundException(`Price list ${id} not found`);
    }
    const count = await this.cplRepo.count({ where: { priceListId: id } });
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete price list assigned to ${count} customer(s)`,
      );
    }
    priceList.archivedAt = new Date();
    priceList.updatedBy = updatedBy;
    await this.plRepo.save(priceList);
  }

  async addItem(
    priceListId: number,
    dto: CreatePriceListItemDto,
  ): Promise<PriceListItem> {
    const priceList = await this.plRepo.findOneBy({ id: priceListId });
    if (!priceList) {
      throw new NotFoundException(`Price list ${priceListId} not found`);
    }

    const product = await this.productRepo.findOneBy({ id: dto.productId });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    const existing = await this.itemRepo.findOneBy({
      priceListId,
      productId: dto.productId,
    });
    if (existing) {
      throw new BadRequestException('Product already in this price list');
    }

    const item = this.itemRepo.create({
      priceListId,
      productId: dto.productId,
      customPrice: dto.customPrice,
      discount: dto.discount ?? null,
    });
    return this.itemRepo.save(item);
  }

  async updateItem(
    priceListId: number,
    itemId: number,
    dto: UpdatePriceListItemDto,
  ): Promise<PriceListItem> {
    const item = await this.itemRepo.findOneBy({ id: itemId, priceListId });
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found in price list ${priceListId}`);
    }

    if (dto.customPrice !== undefined) item.customPrice = dto.customPrice;
    if (dto.discount !== undefined) item.discount = dto.discount ?? null;

    return this.itemRepo.save(item);
  }

  async removeItem(priceListId: number, itemId: number): Promise<void> {
    const item = await this.itemRepo.findOneBy({ id: itemId, priceListId });
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found in price list ${priceListId}`);
    }
    await this.itemRepo.remove(item);
  }

  async bulkAddItems(
    priceListId: number,
    dto: BulkAddItemsDto,
  ): Promise<{ added: number; skipped: number }> {
    const priceList = await this.plRepo.findOneBy({ id: priceListId });
    if (!priceList) {
      throw new NotFoundException(`Price list ${priceListId} not found`);
    }

    const existingItems = await this.itemRepo.find({ where: { priceListId } });
    const existingProductIds = new Set(existingItems.map((i) => i.productId));

    const batch: PriceListItem[] = [];
    let skipped = 0;

    for (const itemDto of dto.items) {
      if (existingProductIds.has(itemDto.productId)) {
        skipped++;
      } else {
        batch.push(
          this.itemRepo.create({
            priceListId,
            productId: itemDto.productId,
            customPrice: itemDto.customPrice,
            discount: itemDto.discount ?? null,
          }),
        );
        existingProductIds.add(itemDto.productId);
      }
    }

    if (batch.length > 0) {
      await this.itemRepo.save(batch);
    }

    return { added: batch.length, skipped };
  }

  async assignCustomer(
    priceListId: number,
    dto: AssignCustomerDto,
    assignedBy: string,
  ): Promise<CustomerPriceList> {
    const priceList = await this.plRepo.findOneBy({ id: priceListId });
    if (!priceList) {
      throw new NotFoundException(`Price list ${priceListId} not found`);
    }

    const existing = await this.cplRepo
      .createQueryBuilder('cpl')
      .innerJoin('cpl.priceList', 'pl')
      .where('cpl.customerId = :customerId', { customerId: dto.customerId })
      .andWhere('pl.status = :status', { status: PriceListStatus.Active })
      .getOne();

    if (existing) {
      throw new BadRequestException('Customer already has an active price list assigned');
    }

    const duplicate = await this.cplRepo.findOneBy({
      customerId: dto.customerId,
      priceListId,
    });
    if (duplicate) {
      throw new BadRequestException('Customer is already assigned to this price list');
    }

    const cpl = this.cplRepo.create({
      customerId: dto.customerId,
      priceListId,
      assignedBy,
    });
    return this.cplRepo.save(cpl);
  }

  async unassignCustomer(priceListId: number, customerId: number): Promise<void> {
    const cpl = await this.cplRepo.findOneBy({ priceListId, customerId });
    if (!cpl) {
      throw new NotFoundException(
        `Customer ${customerId} is not assigned to price list ${priceListId}`,
      );
    }
    await this.cplRepo.remove(cpl);
  }

  async resolvePrice(
    productId: number,
    customerId: number,
  ): Promise<{
    effectivePrice: number;
    source: 'price_list' | 'base_price';
    priceListName?: string;
  }> {
    const today = new Date().toISOString().slice(0, 10);

    const cpl = await this.cplRepo
      .createQueryBuilder('cpl')
      .innerJoinAndSelect('cpl.priceList', 'pl')
      .where('cpl.customerId = :customerId', { customerId })
      .andWhere('pl.status = :status', { status: PriceListStatus.Active })
      .andWhere('(pl.start_date IS NULL OR pl.start_date <= :today)', { today })
      .andWhere('(pl.end_date IS NULL OR pl.end_date >= :today)', { today })
      .getOne();

    if (cpl) {
      const item = await this.itemRepo.findOneBy({
        priceListId: cpl.priceListId,
        productId,
      });
      if (item) {
        return {
          effectivePrice: item.customPrice,
          source: 'price_list',
          priceListName: cpl.priceList.name,
        };
      }
    }

    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    return { effectivePrice: product.basePrice ?? 0, source: 'base_price' };
  }

  async deactivateExpiredPriceLists(): Promise<{ deactivated: number }> {
    const expired = await this.plRepo
      .createQueryBuilder('pl')
      .where('pl.status = :status', { status: PriceListStatus.Active })
      .andWhere('pl.end_date < CURRENT_DATE')
      .getMany();

    for (const pl of expired) {
      pl.status = PriceListStatus.Inactive;
    }

    if (expired.length > 0) {
      await this.plRepo.save(expired);
    }

    return { deactivated: expired.length };
  }
}
