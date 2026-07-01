import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ExactOnlineClientService } from './exact-online-client.service';
import { ExactItem } from './entities/exact-item.entity';
import { ExactItemGroup } from './entities/exact-item-group.entity';
import { Product } from '../products/entities/product.entity';
import { mapItem, mapItemGroup, mapProduct } from './mappers/item.mapper';
import {
  ExactItemResponse,
  ExactItemGroupResponse,
  SyncError,
  SyncSummary,
} from './types';

const PAGE_SIZE = 100;
const MAX_ITEM_PAGES = 3;
const CHUNK_SIZE = 50;

// DB column names updated on conflict — name/weight are seeded on INSERT only; stock is live data from Exact
// status and end_date are intentionally excluded — they are updated separately
// via a conditional UPDATE that skips rows where status_locked = true.
const EXACT_UPDATE_COLUMNS = [
  'barcode',
  'currency',
  'base_price',
  'purchase_price',
  'sales_vat_code',
  'stock',
];

@Injectable()
export class ExactSyncService {
  private readonly logger = new Logger(ExactSyncService.name);

  constructor(
    private readonly client: ExactOnlineClientService,
    @InjectRepository(ExactItem)
    private readonly itemRepo: Repository<ExactItem>,
    @InjectRepository(ExactItemGroup)
    private readonly itemGroupRepo: Repository<ExactItemGroup>,
    private readonly dataSource: DataSource,
  ) {}

  async syncProducts(): Promise<SyncSummary> {
    await this.syncItemGroups();
    return this.syncItems();
  }

  private async syncItemGroups(): Promise<void> {
    await this.client.forEachPage<ExactItemGroupResponse>(
      `logistics/ItemGroups?$top=${PAGE_SIZE}`,
      async (groups) => {
        if (groups.length === 0) return;
        const entities = groups.map((g) =>
          this.itemGroupRepo.create(mapItemGroup(g) as ExactItemGroup),
        );
        await this.itemGroupRepo.save(entities, { chunk: 50 });
      },
    );
  }

  private async syncItems(): Promise<SyncSummary> {
    const existingIds = new Set(
      (await this.itemRepo.find({ select: { id: true } })).map((i) => i.id),
    );

    let synced = 0;
    let created = 0;
    let updated = 0;
    const errors: SyncError[] = [];

    await this.client.forEachPage<ExactItemResponse>(
      `logistics/Items?$top=${PAGE_SIZE}`,
      async (items) => {
        if (items.length === 0) return;

        for (const item of items) {
          synced++;
          if (existingIds.has(item.ID)) updated++;
          else created++;
        }

        const entities = items.map((i) =>
          this.itemRepo.create(mapItem(i) as ExactItem),
        );
        await this.itemRepo.save(entities, { chunk: 50 });

        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
          const chunk = items.slice(i, i + CHUNK_SIZE);
          const mapped = chunk.map(mapProduct);
          try {
            await this.dataSource.transaction(async (em) => {
              // Upsert core fields; status/end_date excluded to avoid overwriting locked rows.
              await em
                .createQueryBuilder()
                .insert()
                .into(Product)
                .values(mapped)
                .orUpdate(EXACT_UPDATE_COLUMNS, ['exact_id'])
                .execute();

              // Update status + end_date only for products where admin has not manually locked the status.
              const params: unknown[] = [];
              const rows = mapped.map((p) => {
                const base = params.length + 1;
                params.push(p.exactId, p.endDate ?? null, p.status);
                return `($${base}::uuid, $${base + 1}::date, $${base + 2}::product_status)`;
              });
              await em.query(
                `UPDATE products p
                 SET end_date = v.end_date, status = v.status
                 FROM (VALUES ${rows.join(', ')}) AS v(exact_id, end_date, status)
                 WHERE p.exact_id = v.exact_id AND p.status_locked = false`,
                params,
              );
            });
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            this.logger.error(
              `Product upsert chunk [${i}..${i + chunk.length - 1}] failed: ${message}`,
            );
            for (const item of chunk)
              errors.push({ exactId: item.ID, message });
          }
        }
      },
      150,
      MAX_ITEM_PAGES,
    );

    return { synced, created, updated, errors };
  }
}
