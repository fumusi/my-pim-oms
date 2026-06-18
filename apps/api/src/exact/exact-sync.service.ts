import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExactOnlineClientService } from './exact-online-client.service';
import { ExactItem } from './entities/exact-item.entity';
import { ExactItemGroup } from './entities/exact-item-group.entity';
import { mapItem, mapItemGroup } from './mappers/item.mapper';
import { ODataResponse, ExactItemResponse, ExactItemGroupResponse, SyncSummary } from './types';

const MAX_ITEM_PAGES = 3;
const PAGE_SIZE = 100;

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
    for (let page = 0; ; page++) {
      const skip = page * PAGE_SIZE;
      const data = await this.client.get<ODataResponse<ExactItemGroupResponse>>(
        `logistics/ItemGroups?$top=${PAGE_SIZE}&$skip=${skip}`,
      );
      const groups = data.d?.results ?? [];
      if (groups.length === 0) break;

      const entities = groups.map((g) => this.itemGroupRepo.create(mapItemGroup(g) as ExactItemGroup));
      await this.itemGroupRepo.save(entities, { chunk: 50 });

      if (groups.length < PAGE_SIZE) break;
    }
  }

  private async syncItems(): Promise<SyncSummary> {
    const existingIds = new Set(
      (await this.itemRepo.find({ select: { id: true } })).map((i) => i.id),
    );

    let synced = 0;
    let created = 0;
    let updated = 0;

    for (let page = 0; page < MAX_ITEM_PAGES; page++) {
      const skip = page * PAGE_SIZE;
      const data = await this.client.get<ODataResponse<ExactItemResponse>>(
        `logistics/Items?$top=${PAGE_SIZE}&$skip=${skip}`,
      );
      const items = data.d?.results ?? [];
      if (items.length === 0) break;

      for (const item of items) {
        synced++;
        if (existingIds.has(item.ID)) updated++;
        else created++;
      }

      const entities = items.map((i) => this.itemRepo.create(mapItem(i) as ExactItem));
      await this.itemRepo.save(entities, { chunk: 50 });

      if (items.length < PAGE_SIZE) break;
    }

    return { synced, created, updated };
  }
}
