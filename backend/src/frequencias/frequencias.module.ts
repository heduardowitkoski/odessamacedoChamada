import { Module } from '@nestjs/common';
import { FrequenciasController } from './frequencias.controller';
import { FrequenciasService } from './frequencias.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [FrequenciasController],
  providers: [FrequenciasService],
  exports: [FrequenciasService],
})
export class FrequenciasModule {}
