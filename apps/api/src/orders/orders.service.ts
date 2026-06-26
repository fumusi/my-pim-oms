import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { LineItem } from './entities/line-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderCalculationService } from './order-calculation.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateOrderDto } from './dto/update-order.dto';
import type { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import type { UpdateLineItemDto } from './dto/update-line-item.dto';
import type { CreateLineItemDto } from './dto/create-order.dto';

export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Draft]: [OrderStatus.Open],
  [OrderStatus.Open]: [
    OrderStatus.Partial,
    OrderStatus.Completed,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.Partial]: [OrderStatus.Completed, OrderStatus.Cancelled],
  [OrderStatus.Completed]: [],
  [OrderStatus.Cancelled]: [],
};

const TERMINAL_STATUSES = [OrderStatus.Completed, OrderStatus.Cancelled];

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(LineItem)
    private readonly lineItemRepo: Repository<LineItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly calc: OrderCalculationService,
  ) {}

  async findAll(query: FindOrdersQueryDto): Promise<PaginatedOrders> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .leftJoinAndSelect('o.shippingAddress', 'shippingAddress')
      .leftJoinAndSelect('o.lineItems', 'lineItems')
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.archived) {
      qb.andWhere('o.archivedAt IS NOT NULL');
    } else {
      qb.andWhere('o.archivedAt IS NULL');
    }

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }

    if (query.customerId) {
      qb.andWhere('o.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.deliveryOption) {
      qb.andWhere('o.deliveryOption = :deliveryOption', {
        deliveryOption: query.deliveryOption,
      });
    }

    if (query.dateFrom) {
      qb.andWhere('o.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('o.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    if (query.search) {
      const s = `%${query.search}%`;
      qb.andWhere('(o.orderNumber ILIKE :s OR customer.name ILIKE :s)', { s });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: { lineItems: true, customer: true, shippingAddress: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(dto: CreateOrderDto, createdBy: string): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      const orderNumber = await this.generateOrderNumber(em);

      const nominalShippingCost = dto.shippingCost ?? 0;

      const order = em.create(Order, {
        orderNumber,
        customerId: dto.customerId,
        shippingAddressId: dto.shippingAddressId,
        deliveryOption: dto.deliveryOption,
        description: dto.description ?? null,
        vatPercentage: dto.vatPercentage ?? null,
        status: OrderStatus.Draft,
        orderSource: 'manual',
        nominalShippingCost,
        shippingCost: nominalShippingCost,
        freeShippingApplied: false,
        totalExclVat: null,
        vatAmount: null,
        totalInclVat: null,
        archiveReason: null,
        archivedAt: null,
        createdBy,
        updatedBy: createdBy,
      });
      const savedOrder = await em.save(Order, order);

      const productIds = dto.lineItems.map((li) => li.productId);
      const products = await em.find(Product, { where: { id: In(productIds) } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const lineItems: LineItem[] = [];
      for (const liDto of dto.lineItems) {
        const product = productMap.get(liDto.productId);
        if (!product)
          throw new NotFoundException(`Product ${liDto.productId} not found`);

        const lineTotal = this.calc.calcLineTotal({
          unitPrice: liDto.unitPrice,
          quantity: liDto.quantity,
          discount: liDto.discount ?? 0,
        });

        const lineItem = em.create(LineItem, {
          orderId: savedOrder.id,
          productId: liDto.productId,
          productName:
            product.name?.en ?? product.name?.nl ?? String(liDto.productId),
          sku: product.barcode ?? null,
          quantity: liDto.quantity,
          unitPrice: liDto.unitPrice,
          discount: liDto.discount ?? 0,
          lineTotalExclVat: lineTotal,
          isFulfillable: this.calc.isFulfillable(product.stock, liDto.quantity),
        });
        lineItems.push(await em.save(LineItem, lineItem));
      }

      savedOrder.lineItems = lineItems;

      const totals = this.calc.calcTotals(
        lineItems.map((li) => ({
          unitPrice: li.unitPrice,
          quantity: li.quantity,
          discount: li.discount,
        })),
        savedOrder.vatPercentage,
        nominalShippingCost,
      );
      savedOrder.totalExclVat = totals.totalExclVat;
      savedOrder.vatAmount = totals.vatAmount;
      savedOrder.totalInclVat = totals.totalInclVat;
      savedOrder.shippingCost = totals.shippingCost;
      savedOrder.freeShippingApplied = totals.freeShippingApplied;

      await em.save(Order, savedOrder);
      return savedOrder;
    });
  }

  async update(
    id: number,
    dto: UpdateOrderDto,
    updatedBy: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      const order = await em.findOne(Order, {
        where: { id },
        relations: { lineItems: true, customer: true, shippingAddress: true },
      });
      if (!order) throw new NotFoundException(`Order ${id} not found`);

      if (TERMINAL_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          'Order cannot be modified in its current status',
        );
      }

      if (dto.description !== undefined)
        order.description = dto.description ?? null;
      if (dto.deliveryOption !== undefined)
        order.deliveryOption = dto.deliveryOption;
      if (dto.trackingUrl !== undefined)
        order.trackingUrl = dto.trackingUrl ?? null;
      if (dto.shippingAddressId !== undefined)
        order.shippingAddressId = dto.shippingAddressId;
      if (dto.shippingCost !== undefined)
        order.nominalShippingCost = dto.shippingCost;

      order.updatedBy = updatedBy;

      order.lineItems = await em.find(LineItem, { where: { orderId: id } });
      await this.recalculateAndSaveOrder(order, em);

      return em.findOne(Order, {
        where: { id },
        relations: { lineItems: true, customer: true, shippingAddress: true },
      }) as Promise<Order>;
    });
  }

  async updateStatus(
    id: number,
    newStatus: OrderStatus,
    updatedBy: string,
  ): Promise<Order> {
    const order = await this.findById(id);

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException('Invalid status transition');
    }

    order.status = newStatus;
    order.updatedBy = updatedBy;
    return this.orderRepo.save(order);
  }

  async addLineItem(
    orderId: number,
    dto: CreateLineItemDto,
    updatedBy: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      const order = await em.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: true, customer: true, shippingAddress: true },
      });
      if (!order) throw new NotFoundException(`Order ${orderId} not found`);

      if (TERMINAL_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          'Order cannot be modified in its current status',
        );
      }

      const product = await em.findOne(Product, {
        where: { id: dto.productId },
      });
      if (!product)
        throw new NotFoundException(`Product ${dto.productId} not found`);

      const lineTotal = this.calc.calcLineTotal({
        unitPrice: dto.unitPrice,
        quantity: dto.quantity,
        discount: dto.discount ?? 0,
      });

      const lineItem = em.create(LineItem, {
        orderId,
        productId: dto.productId,
        productName:
          product.name?.en ?? product.name?.nl ?? String(dto.productId),
        sku: product.barcode ?? null,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        discount: dto.discount ?? 0,
        lineTotalExclVat: lineTotal,
        isFulfillable: this.calc.isFulfillable(product.stock, dto.quantity),
      });
      await em.save(LineItem, lineItem);

      order.lineItems = await em.find(LineItem, { where: { orderId } });
      order.updatedBy = updatedBy;

      await this.recalculateAndSaveOrder(order, em);
      return em.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: true, customer: true, shippingAddress: true },
      }) as Promise<Order>;
    });
  }

  async updateLineItem(
    orderId: number,
    itemId: number,
    dto: UpdateLineItemDto,
    updatedBy: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      const order = await em.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: true, customer: true, shippingAddress: true },
      });
      if (!order) throw new NotFoundException(`Order ${orderId} not found`);

      if (TERMINAL_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          'Order cannot be modified in its current status',
        );
      }

      const lineItem = await em.findOne(LineItem, { where: { id: itemId } });
      if (!lineItem || lineItem.orderId !== orderId) {
        throw new NotFoundException(
          `Line item ${itemId} not found for order ${orderId}`,
        );
      }

      if (dto.quantity !== undefined) lineItem.quantity = dto.quantity;
      if (dto.unitPrice !== undefined) lineItem.unitPrice = dto.unitPrice;
      if (dto.discount !== undefined) lineItem.discount = dto.discount;

      lineItem.lineTotalExclVat = this.calc.calcLineTotal({
        unitPrice: lineItem.unitPrice,
        quantity: lineItem.quantity,
        discount: lineItem.discount,
      });

      const product = await em.findOne(Product, {
        where: { id: lineItem.productId },
      });
      lineItem.isFulfillable = this.calc.isFulfillable(
        product?.stock ?? null,
        lineItem.quantity,
      );

      await em.save(LineItem, lineItem);

      order.lineItems = await em.find(LineItem, { where: { orderId } });
      order.updatedBy = updatedBy;

      await this.recalculateAndSaveOrder(order, em);
      return em.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: true, customer: true, shippingAddress: true },
      }) as Promise<Order>;
    });
  }

  async removeLineItem(
    orderId: number,
    itemId: number,
    updatedBy: string,
  ): Promise<void> {
    return this.dataSource.transaction(async (em) => {
      const order = await em.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: true, customer: true, shippingAddress: true },
      });
      if (!order) throw new NotFoundException(`Order ${orderId} not found`);

      if (TERMINAL_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          'Order cannot be modified in its current status',
        );
      }

      const lineItems = await em.find(LineItem, { where: { orderId } });
      if (lineItems.length <= 1) {
        throw new BadRequestException(
          'Cannot remove the only line item from an order',
        );
      }

      const target = lineItems.find((li) => li.id === itemId);
      if (!target) {
        throw new NotFoundException(
          `Line item ${itemId} not found for order ${orderId}`,
        );
      }

      await em.remove(LineItem, target);

      order.lineItems = lineItems.filter((li) => li.id !== itemId);
      order.updatedBy = updatedBy;

      await this.recalculateAndSaveOrder(order, em);
    });
  }

  async archive(id: number, reason: string, updatedBy: string): Promise<Order> {
    const order = await this.findById(id);

    if (!TERMINAL_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'Only completed or cancelled orders can be archived',
      );
    }

    if (order.archivedAt != null) {
      throw new BadRequestException('Order is already archived');
    }

    order.archiveReason = reason;
    order.archivedAt = new Date();
    order.updatedBy = updatedBy;
    return this.orderRepo.save(order);
  }

  private async recalculateAndSaveOrder(order: Order, em: EntityManager): Promise<void> {
    const totals = this.calc.calcTotals(
      order.lineItems.map((li) => ({
        unitPrice: li.unitPrice,
        quantity: li.quantity,
        discount: li.discount,
      })),
      order.vatPercentage,
      order.nominalShippingCost,
    );
    order.totalExclVat = totals.totalExclVat;
    order.vatAmount = totals.vatAmount;
    order.totalInclVat = totals.totalInclVat;
    order.shippingCost = totals.shippingCost;
    order.freeShippingApplied = totals.freeShippingApplied;
    await em.save(Order, order);
  }

  private async generateOrderNumber(em: EntityManager): Promise<string> {
    const result: Array<{ next: number }> = await em.query(
      `SELECT nextval('order_number_seq') AS next`,
    );
    const next = result[0].next;
    return `ORD-${String(next).padStart(4, '0')}`;
  }
}
