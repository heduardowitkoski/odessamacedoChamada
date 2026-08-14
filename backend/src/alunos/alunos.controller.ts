import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { AlunosService } from './alunos.service';

@Controller('alunos')
export class AlunosController {
  constructor(private readonly alunosService: AlunosService) {}

  @Get()
  async findAll() {
    return this.alunosService.findAll();
  }

  @Post()
  async create(@Body() createAlunoDto: any) {
    return this.alunosService.create(createAlunoDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('turma_id') turma_id: string,
  ) {
    return this.alunosService.updateStatus(id, status, turma_id);
  }
}
