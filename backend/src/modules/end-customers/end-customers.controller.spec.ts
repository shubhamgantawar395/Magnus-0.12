import { Test, TestingModule } from '@nestjs/testing';
import { EndCustomersController } from './end-customers.controller';
import { EndCustomersService } from './end-customers.service';

describe('EndCustomersController', () => {
  let controller: EndCustomersController;

  const mockEndCustomersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EndCustomersController],
      providers: [
        {
          provide: EndCustomersService,
          useValue: mockEndCustomersService,
        },
      ],
    }).compile();

    controller = module.get<EndCustomersController>(EndCustomersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
