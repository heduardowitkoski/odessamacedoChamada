import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { MuralService } from './mural.service';
import { CriarMuralDto, AtualizarMuralDto } from './mural.dto';

@Controller('mural')
export class MuralController {
  constructor(private readonly muralService: MuralService) {}

  @Get()
  async listar(@Query('turma_id') turmaId?: string) {
    return this.muralService.listar(turmaId);
  }

  @Post()
  async criar(@Body() dto: CriarMuralDto) {
    return this.muralService.criar(dto);
  }

  @Put(':id')
  async atualizarPut(@Param('id') id: string, @Body() dto: AtualizarMuralDto) {
    return this.muralService.atualizar(id, dto);
  }

  @Patch(':id')
  async atualizarPatch(@Param('id') id: string, @Body() dto: AtualizarMuralDto) {
    return this.muralService.atualizar(id, dto);
  }

  @Delete(':id')
  async remover(@Param('id') id: string) {
    return this.muralService.remover(id);
  }
}
