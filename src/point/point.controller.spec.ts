import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PointController } from './point.controller';
import { PointService } from './point.service';

describe('PointController test', () => {
  let app: INestApplication;
  let pointService = {
    getUserPoint: jest.fn().mockResolvedValue({ id: 1, point: 100 }),
    getPointHistories: jest
      .fn()
      .mockResolvedValue([
        { userId: 1, amount: 50, type: 'CHARGE', timestamp: Date.now() },
      ]),
    chargeUserPoint: jest.fn().mockResolvedValue({ id: 1, point: 150 }),
    useUserPoint: jest.fn().mockResolvedValue({ id: 1, point: 50 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [
        {
          provide: PointService,
          useValue: pointService, // PointService를 Mock 객체로 제공
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /point/:id', () => {
    it('should return user points for a valid user ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/point/1') // 요청 보내기
        .expect(200); // 응답 상태 코드 검사

      expect(response.body).toEqual({ id: 1, point: 100 });
    });

    it('should return BadRequestException for invalid user ID', async () => {
      await request(app.getHttpServer())
        .get('/point/0') // 잘못된 ID
        .expect(400); // Bad Request 상태 코드
    });
  });

  describe('GET /point/:id/histories', () => {
    it('should return point histories for a valid user ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/point/1/histories')
        .expect(200);

      expect(response.body).toEqual([
        {
          userId: 1,
          amount: 50,
          type: 'CHARGE',
          timestamp: expect.any(Number),
        },
      ]);
    });

    it('should return BadRequestException for invalid user ID', async () => {
      await request(app.getHttpServer()).get('/point/0/histories').expect(400);
    });
  });

  describe('PATCH /point/:id/charge', () => {
    it('should charge user points correctly', async () => {
      const response = await request(app.getHttpServer())
        .patch('/point/1/charge')
        .send({ amount: 50 }) // 요청 body
        .expect(200);

      expect(response.body).toEqual({ id: 1, point: 150 });
    });

    it('should return BadRequestException for invalid user ID', async () => {
      await request(app.getHttpServer())
        .patch('/point/0/charge')
        .send({ amount: 50 })
        .expect(400);
    });

    it('should return BadRequestException for invalid amount', async () => {
      await request(app.getHttpServer())
        .patch('/point/1/charge')
        .send({ amount: -10 }) // 잘못된 amount
        .expect(400);
    });
  });

  describe('PATCH /point/:id/use', () => {
    it('should deduct user points correctly', async () => {
      const response = await request(app.getHttpServer())
        .patch('/point/1/use')
        .send({ amount: 50 })
        .expect(200);

      expect(response.body).toEqual({ id: 1, point: 50 });
    });

    it('should return BadRequestException for invalid user ID', async () => {
      await request(app.getHttpServer())
        .patch('/point/0/use')
        .send({ amount: 50 })
        .expect(400);
    });

    it('should return BadRequestException for invalid amount', async () => {
      await request(app.getHttpServer())
        .patch('/point/1/use')
        .send({ amount: -10 })
        .expect(400);
    });
  });
});
