import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExactOnlineClientService } from './exact-online-client.service';
import { ExactItem } from './entities/exact-item.entity';
import { ExactItemGroup } from './entities/exact-item-group.entity';
import { mapItem, mapItemGroup } from './mappers/item.mapper';
import { ExactItemResponse, ExactItemGroupResponse, SyncSummary } from './types';

const PAGE_SIZE = 100;
const MAX_ITEM_PAGES = 3;

@Injectable()
export class ExactSyncService {
  constructor(
    private readonly client: ExactOnlineClientService,
    @InjectRepository(ExactItem)
    private readonly itemRepo: Repository<ExactItem>,
    @InjectRepository(ExactItemGroup)
    private readonly itemGroupRepo: Repository<ExactItemGroup>,
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
        const entities = groups.map((g) => this.itemGroupRepo.create(mapItemGroup(g) as ExactItemGroup));
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

    await this.client.forEachPage<ExactItemResponse>(
      `logistics/Items?$top=${PAGE_SIZE}`,
      async (items) => {
        if (items.length === 0) return;

        for (const item of items) {
          synced++;
          if (existingIds.has(item.ID)) updated++;
          else created++;
        }

        const entities = items.map((i) => this.itemRepo.create(mapItem(i) as ExactItem));
        await this.itemRepo.save(entities, { chunk: 50 });
      },
      150,
      MAX_ITEM_PAGES,
    );

    return { synced, created, updated };
  }
}
