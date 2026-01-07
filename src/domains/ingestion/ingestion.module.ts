// domains/ingestion/ingestions.module.ts (или ingestion.module.ts)
import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { MESSAGE_BUFFER } from './message-buffer.token';
import { PostgresMessageBuffer } from '../../infrastructure/database/postgres/postgres-message-buffer';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    IngestionService,
    { provide: MESSAGE_BUFFER, useClass: PostgresMessageBuffer },
  ],
  exports: [IngestionService],
})
export class IngestionModule {}
