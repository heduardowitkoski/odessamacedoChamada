import { Controller, Get, Post, Patch, Delete, Body, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TurmasService } from './turmas.service';

@Controller('turmas')
export class TurmasController {
  constructor(private readonly turmasService: TurmasService) {}

  @Get()
  async findAll() {
    return this.turmasService.findAll();
  }

  @Get('exportar-csv')
  async exportarCSV(@Res() res: Response) {
    const csv = await this.turmasService.exportarTurmasCSV();
    const filename = `turmas_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
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
