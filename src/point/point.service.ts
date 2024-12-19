import { Injectable, BadRequestException } from '@nestjs/common';
import AsyncLock from 'async-lock';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistoryTable } from '../database/pointhistory.table';

@Injectable()
export class PointService {
  private lock: AsyncLock;

  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
  ) {
    this.lock = new AsyncLock();
  }

  // 특정 유저의 포인트 조회
  async getUserPoint(userId: number): Promise<UserPoint> {
    const user = await this.userDb.selectById(userId);

    return user;
  }

  // 특정 유저의 포인트 충전/이용 내역 조회
  async getPointHistories(userId: number): Promise<PointHistory[]> {
    return this.historyDb.selectAllByUserId(userId);
  }

  // 특정 유저의 포인트 충전
  async chargeUserPoint(userId: number, amount: number): Promise<UserPoint> {
    return this.lock.acquire(`user-${userId}`, async () => {
      const user = await this.userDb.selectById(userId);

      const updatedPoint = user.point + amount;

      const updatedUserPoint = await this.userDb.insertOrUpdate(
        userId,
        updatedPoint,
      );
      await this.historyDb.insert(
        userId,
        amount,
        TransactionType.CHARGE,
        updatedUserPoint.updateMillis,
      );

      return updatedUserPoint;
    });
  }

  // 특정 유저의 포인트 사용
  async useUserPoint(userId: number, amount: number): Promise<UserPoint> {
    return this.lock.acquire(`user-${userId}`, async () => {
      const user = await this.userDb.selectById(userId);

      if (user.point < amount) {
        throw new BadRequestException('Insufficient points');
      }

      const updatedPoint = user.point - amount;

      const updatedUserPoint = await this.userDb.insertOrUpdate(
        userId,
        updatedPoint,
      );
      await this.historyDb.insert(
        userId,
        -amount,
        TransactionType.USE,
        updatedUserPoint.updateMillis,
      );

      return updatedUserPoint;
    });
  }
}
