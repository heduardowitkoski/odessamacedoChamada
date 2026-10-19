import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, MuralItem } from '../database/database.service';
import { CriarMuralDto, AtualizarMuralDto } from './mural.dto';

@Injectable()
export class MuralService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listar(turmaId?: string): Promise<MuralItem[]> {
    return this.databaseService.getMural(turmaId);
  }

  async criar(dto: CriarMuralDto): Promise<MuralItem> {
    return this.databaseService.createMuralItem(dto);
  }

  async atualizar(id: string, dto: AtualizarMuralDto): Promise<MuralItem> {
    const item = await this.databaseService.updateMuralItem(id, dto);
    if (!item) {
      throw new NotFoundException('Obra não encontrada no mural.');
    }
    return item;
  }

  async remover(id: string): Promise<{ success: boolean; message: string }> {
    const removido = await this.databaseService.deleteMuralItem(id);
    if (!removido) {
      throw new NotFoundException('Obra não encontrada no mural.');
    }
    return { success: true, message: 'Obra removida do mural com sucesso.' };
  }
}
