import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExactOnlineToken } from './entities/exact-online-token.entity';
import { ExactItem } from './entities/exact-item.entity';
import { ExactItemGroup } from './entities/exact-item-group.entity';
import { ExactOnlineAuthService } from './exact-online-auth.service';
import { ExactOnlineClientService } from './exact-online-client.service';
import { ExactSyncService } from './exact-sync.service';
import { ItemsService } from './items.service';
import { ExactController } from './exact.controller';
import { ItemsController } from './items.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: 30_000 }),
    TypeOrmModule.forFeature([ExactOnlineToken, ExactItem, ExactItemGroup]),
  ],
  controllers: [ExactController, ItemsController],
  providers: [ExactOnlineAuthService, ExactOnlineClientService, ExactSyncService, ItemsService],
  exports: [ExactOnlineAuthService, ExactSyncService, ItemsService],
})
export class ExactModule {}
