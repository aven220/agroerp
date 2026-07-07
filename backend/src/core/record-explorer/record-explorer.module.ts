import { Module } from '@nestjs/common';
import { PrmModule } from '@/core/prm/prm.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EventsModule } from '@/core/events/events.module';
import { FormsModule } from '@/core/forms/forms.module';
import { RecordExplorerAggregatorService } from './application/record-explorer-aggregator.service';
import { RecordExplorerController } from './presentation/record-explorer.controller';

@Module({
  imports: [PrmModule, FtipModule, FmdtModule, EventsModule, FormsModule],
  controllers: [RecordExplorerController],
  providers: [RecordExplorerAggregatorService],
  exports: [RecordExplorerAggregatorService],
})
export class RecordExplorerModule {}
