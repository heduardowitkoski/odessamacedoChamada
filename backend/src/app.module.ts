import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { TurmasModule } from './turmas/turmas.module';
import { AlunosModule } from './alunos/alunos.module';
import { FrequenciasModule } from './frequencias/frequencias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule, 
    TurmasModule, 
    AlunosModule,
    FrequenciasModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

