import { Module } from '@nestjs/common';
import { TurmasController } from './turmas.controller';
import { TurmasService } from './turmas.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [SupabaseModule, DatabaseModule],
  controllers: [TurmasController],
  providers: [TurmasService],
  exports: [TurmasService],
})
export class TurmasModule {}
