import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from './point.service';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistoryTable } from '../database/pointhistory.table';
import { BadRequestException } from '@nestjs/common';
import { TransactionType } from './point.model';

describe('PointService', () => {
  let pointService: PointService;
  let userDb: UserPointTable;
  let historyDb: PointHistoryTable;

  beforeEach(async () => {
    userDb = new UserPointTable();
    historyDb = new PointHistoryTable();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointService,
        { provide: UserPointTable, useValue: userDb },
        { provide: PointHistoryTable, useValue: historyDb },
      ],
    }).compile();

    pointService = module.get<PointService>(PointService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUserPoint', () => {
    it('should return user points for a valid userId', async () => {
      await userDb.insertOrUpdate(1, 100);

      const result = await pointService.getUserPoint(1);
      expect(result).toEqual({
        id: 1,
        point: 100,
        updateMillis: expect.any(Number),
      });
    });
  });

  describe('getPointHistories', () => {
    it('should return point histories for a valid userId', async () => {
      await historyDb.insert(1, 100, TransactionType.CHARGE, Date.now());

      const result = await pointService.getPointHistories(1);
      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({ userId: 1, amount: 100 });
    });
  });

  describe('chargeUserPoint', () => {
    it('should charge user points correctly', async () => {
      await userDb.insertOrUpdate(1, 50);

      const result = await pointService.chargeUserPoint(1, 50);
      expect(result.point).toBe(100);
    });
  });

  describe('useUserPoint', () => {
    it('should deduct user points correctly', async () => {
      await userDb.insertOrUpdate(1, 100);

      const result = await pointService.useUserPoint(1, 50);
      expect(result.point).toBe(50);
    });

    it('should throw BadRequestException if points are insufficient', async () => {
      await userDb.insertOrUpdate(1, 30);

      await expect(pointService.useUserPoint(1, 50)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Concurrency Tests', () => {
    it('should handle concurrent charge requests correctly', async () => {
      await userDb.insertOrUpdate(1, 100);

      const promises = [
        pointService.chargeUserPoint(1, 50),
        pointService.chargeUserPoint(1, 30),
        pointService.chargeUserPoint(1, 20),
      ];

      const results = await Promise.all(promises);

      const finalResult = await pointService.getUserPoint(1);
      expect(finalResult.point).toBe(200);

      expect(results[0].point).toBe(150);
      expect(results[1].point).toBe(180);
      expect(results[2].point).toBe(200);
    });

    it('should handle concurrent use requests correctly', async () => {
      await userDb.insertOrUpdate(1, 300);

      const promises = [
        pointService.useUserPoint(1, 50),
        pointService.useUserPoint(1, 100),
        pointService.useUserPoint(1, 150),
      ];

      const results = await Promise.all(promises);

      expect(results[0].point).toBe(250);
      expect(results[1].point).toBe(150);
      expect(results[2].point).toBe(0);

      const finalResult = await pointService.getUserPoint(1);
      expect(finalResult.point).toBe(0);
    });

    it('should throw an exception if points are insufficient in concurrent use requests', async () => {
      await userDb.insertOrUpdate(1, 100);

      const promises = [
        pointService.useUserPoint(1, 70),
        pointService.useUserPoint(1, 50),
      ];

      await expect(Promise.all(promises)).rejects.toThrow(BadRequestException);

      const finalResult = await pointService.getUserPoint(1);
      expect(finalResult.point).toBeGreaterThanOrEqual(30);
    });
  });
});
