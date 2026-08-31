import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { FrequenciasService, RegistroFrequenciaDto } from './frequencias.service';

@Controller('frequencias')
export class FrequenciasController {
  constructor(private readonly frequenciasService: FrequenciasService) {}

  @Get('turma/:turmaId')
  async getByTurmaEData(
    @Param('turmaId') turmaId: string,
    @Query('data') data: string,
  ) {
    const dataStr = data || new Date().toISOString().split('T')[0];
    return this.frequenciasService.buscarPorTurmaEData(turmaId, dataStr);
  }

  @Post('batch')
  async salvarLote(
    @Body('turma_id') turmaId: string,
    @Body('data') data: string,
    @Body('registros') registros: RegistroFrequenciaDto[],
  ) {
    return this.frequenciasService.salvarLote(turmaId, data, registros);
  }

  @Get('alertas')
  async getAlertas() {
    return this.frequenciasService.buscarAlertasFaltas();
  }
}
