import { Module } from '@nestjs/common';
import { MuralController } from './mural.controller';
import { MuralService } from './mural.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MuralController],
  providers: [MuralService],
  exports: [MuralService],
})
export class MuralModule {}
