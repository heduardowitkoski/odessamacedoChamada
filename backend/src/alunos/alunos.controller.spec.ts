import { Test, TestingModule } from '@nestjs/testing';
import { AlunosController } from './alunos.controller';
import { AlunosService } from './alunos.service';

describe('AlunosController', () => {
  let controller: AlunosController;

  const mockAlunosService = {
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
    updateStatus: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlunosController],
      providers: [
        { provide: AlunosService, useValue: mockAlunosService },
      ],
    }).compile();

    controller = module.get<AlunosController>(AlunosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
