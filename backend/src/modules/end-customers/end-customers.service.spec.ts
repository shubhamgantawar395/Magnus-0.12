import { Test, TestingModule } from '@nestjs/testing';
import { EndCustomersService } from './end-customers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUEST } from '@nestjs/core';

describe('EndCustomersService', () => {
  let service: EndCustomersService;

  const mockPrismaService = {
    endCustomer: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockRequest = {
    user: {
      organizationId: 'test-org-id',
      role: 'admin',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndCustomersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    service = module.get<EndCustomersService>(EndCustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
