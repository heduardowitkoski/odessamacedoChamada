import { Controller, Get, Post, Body } from '@nestjs/common';
import { TurmasService } from './turmas.service';

@Controller('turmas')
export class TurmasController {
  constructor(private readonly turmasService: TurmasService) {}

  @Get()
  async findAll() {
    return this.turmasService.findAll();
  }

  @Post()
  async create(@Body() createTurmaDto: { nome: string; turno: string; capacidade: number }) {
    return this.turmasService.create(createTurmaDto);
  }
}
