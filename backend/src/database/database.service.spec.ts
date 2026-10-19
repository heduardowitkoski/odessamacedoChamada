import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('DatabaseService', () => {
  let service: DatabaseService;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve criar turma e retornar instantaneamente da memória', async () => {
    const turma = await service.createTurma({
      nome: 'Turma Teste RAM 11 a 13 anos',
      turno: 'Manhã',
      capacidade: 10,
    });

    expect(turma).toBeDefined();
    expect(turma.nome).toBe('Turma Teste RAM 11 a 13 anos');
    expect(turma.idade_minima).toBe(11);
    expect(turma.idade_maxima).toBe(13);

    const turmas = await service.getTurmas();
    expect(turmas.some((t) => t.id === turma.id)).toBe(true);
  });

  it('deve matricular aluno, alocar vaga e servir direto da RAM com turmas mapeadas', async () => {
    const turma = await service.createTurma({
      nome: 'Desenho Juvenil 14 a 17 anos',
      turno: 'Tarde',
      capacidade: 5,
    });

    const aluno = await service.createAluno({
      aluno_nome: 'Carlos Drummond',
      aluno_nascimento: '2010-05-15',
      resp_nome: 'Maria Drummond',
      resp_telefone: '(53) 98888-7777',
      turma_id: turma.id,
    });

    expect(aluno).toBeDefined();
    expect(aluno.status).toBe('Ativo');

    const todos = await service.getAlunos();
    const alunoEncontrado = todos.find((a) => a.id === aluno.id);
    expect(alunoEncontrado).toBeDefined();
    expect(alunoEncontrado?.turmas?.nome).toBe('Desenho Juvenil 14 a 17 anos');
  });

  it('regra de absenteísmo: não remove aluno ativo ao acumular 3 ou mais faltas', async () => {
    const turma = await service.createTurma({
      nome: 'Pintura a Óleo',
      turno: 'Noite',
      capacidade: 5,
    });

    const aluno = await service.createAluno({
      aluno_nome: 'Ana Faltosa',
      aluno_nascimento: '2010-01-01',
      resp_nome: 'Pai da Ana',
      resp_telefone: '(53) 99999-1111',
      turma_id: turma.id,
    });

    // Registra 3 faltas
    await service.saveFrequencias(turma.id, '2026-10-01', [{ aluno_id: aluno.id, status: 'FALTA' }]);
    await service.saveFrequencias(turma.id, '2026-10-02', [{ aluno_id: aluno.id, status: 'FALTA' }]);
    await service.saveFrequencias(turma.id, '2026-10-03', [{ aluno_id: aluno.id, status: 'FALTA' }]);

    const alertas = await service.getAlertasFaltas();
    const alertaAna = alertas.find((al) => al.aluno.id === aluno.id);

    expect(alertaAna).toBeDefined();
    expect(alertaAna?.faltasConsecutivas).toBeGreaterThanOrEqual(3);

    // Garante que o status permanece Ativo
    const alunos = await service.getAlunos();
    const alunoStatus = alunos.find((a) => a.id === aluno.id);
    expect(alunoStatus?.status).toBe('Ativo');
  });
});
