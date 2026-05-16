import { Test, TestingModule } from '@nestjs/testing';
import { ViolationController } from '../violation.controller';
import { ViolationService } from '../violation.service';

describe('ViolationController', () => {
  let controller: ViolationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViolationController],
      providers: [ViolationService],
    }).compile();

    controller = module.get<ViolationController>(ViolationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
