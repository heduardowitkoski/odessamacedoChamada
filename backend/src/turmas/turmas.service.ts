import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TurmasService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.getTurmas();
  }

  async findOne(id: string) {
    return this.db.getTurmaById(id);
  }

  async create(createTurmaDto: { nome: string; turno: string; capacidade: number }) {
    return this.db.createTurma(createTurmaDto);
  }
}
