import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { TurmasService } from './turmas.service';

@Controller('turmas')
export class TurmasController {
  constructor(private readonly turmasService: TurmasService) {}

  @Get()
  async findAll() {
    return this.turmasService.findAll();
  }

  @Post()
  async create(@Body() createTurmaDto: { nome: string; turno: string; capacidade: number; idade_minima?: number; idade_maxima?: number }) {
    return this.turmasService.create(createTurmaDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: { nome?: string; turno?: string; capacidade?: number; idade_minima?: number; idade_maxima?: number },
  ) {
    return this.turmasService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.turmasService.remove(id);
  }
}
