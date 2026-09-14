import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AlunosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.getAlunos();
  }

  async create(createAlunoDto: any) {
    return this.db.createAluno(createAlunoDto);
  }

  async updateStatus(id: string, novoStatus: string, turma_id: string) {
    const aluno = await this.db.updateAlunoStatus(id, novoStatus, turma_id);
    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }
    return aluno;
  }
}
