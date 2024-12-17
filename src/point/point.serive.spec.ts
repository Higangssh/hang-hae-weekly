import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from './point.service';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistoryTable } from '../database/pointhistory.table';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  afterEach(() => {});

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

    it('should throw BadRequestException for invalid userId', async () => {
      await expect(pointService.getUserPoint(0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      await expect(pointService.getUserPoint(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPointHistories', () => {
    it('should return point histories for a valid userId', async () => {
      await historyDb.insert(1, 100, TransactionType.CHARGE, Date.now());

      const result = await pointService.getPointHistories(1);
      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({ userId: 1, amount: 100 });
    });

    it('should throw BadRequestException for invalid userId', async () => {
      await expect(pointService.getPointHistories(-1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('chargeUserPoint', () => {
    it('should charge user points correctly', async () => {
      await userDb.insertOrUpdate(1, 50);

      const result = await pointService.chargeUserPoint(1, 50, Date.now());
      expect(result.point).toBe(100);
    });

    it('should throw BadRequestException for invalid amount', async () => {
      await expect(
        pointService.chargeUserPoint(1, 0, Date.now()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid userId', async () => {
      await expect(
        pointService.chargeUserPoint(0, 50, Date.now()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('useUserPoint', () => {
    it('should deduct user points correctly', async () => {
      await userDb.insertOrUpdate(1, 100);

      const result = await pointService.useUserPoint(1, 50, Date.now());
      expect(result.point).toBe(50);
    });

    it('should throw BadRequestException if points are insufficient', async () => {
      await userDb.insertOrUpdate(1, 30);

      await expect(
        pointService.useUserPoint(1, 50, Date.now()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid amount', async () => {
      await expect(
        pointService.useUserPoint(1, -10, Date.now()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      await expect(
        pointService.useUserPoint(99, 30, Date.now()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
