import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface RegistroFrequenciaDto {
  aluno_id: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
  observacao?: string;
}

@Injectable()
export class FrequenciasService {
  constructor(private readonly db: DatabaseService) {}

  async buscarPorTurmaEData(turma_id: string, dataStr: string) {
    return this.db.getFrequencias(turma_id, dataStr);
  }

  async salvarLote(turma_id: string, dataStr: string, registros: RegistroFrequenciaDto[]) {
    return this.db.saveFrequencias(turma_id, dataStr, registros);
  }

  async buscarAlertasFaltas() {
    return this.db.getAlertasFaltas();
  }
}
