import { Test, TestingModule } from '@nestjs/testing';
import { ViolationService } from '../violation.service';

describe('ViolationService', () => {
  let service: ViolationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ViolationService],
    }).compile();

    service = module.get<ViolationService>(ViolationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
