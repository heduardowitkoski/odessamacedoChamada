import { Test, TestingModule } from '@nestjs/testing';
import { TurmasController } from './turmas.controller';
import { TurmasService } from './turmas.service';

describe('TurmasController', () => {
  let controller: TurmasController;

  const mockTurmasService = {
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TurmasController],
      providers: [
        { provide: TurmasService, useValue: mockTurmasService },
      ],
    }).compile();

    controller = module.get<TurmasController>(TurmasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
