import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { DatabaseModule } from './database/database.module';
import { TurmasModule } from './turmas/turmas.module';
import { AlunosModule } from './alunos/alunos.module';
import { FrequenciasModule } from './frequencias/frequencias.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { MuralModule } from './mural/mural.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    DatabaseModule,
    TurmasModule,
    AlunosModule,
    FrequenciasModule,
    EmailModule,
    AdminModule,
    RelatoriosModule,
    MuralModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
