import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistoryTable } from '../database/pointhistory.table';

@Injectable()
export class PointService {
  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
  ) {}

  // 특정 유저의 포인트 조회
  async getUserPoint(userId: number): Promise<UserPoint> {
    const user = await this.userDb.selectById(userId);

    if (this.isNotExistUser(user, user.updateMillis)) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  // 특정 유저의 포인트 충전/이용 내역 조회
  async getPointHistories(userId: number): Promise<PointHistory[]> {
    return this.historyDb.selectAllByUserId(userId);
  }

  // 특정 유저의 포인트 충전
  async chargeUserPoint(
    userId: number,
    amount: number,
    date: number,
  ): Promise<UserPoint> {
    const uesr = await this.userDb.selectById(userId);

    // 존재하는 유저 인지 확인
    if (this.isNotExistUser(uesr, uesr.updateMillis)) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updatedPoint = uesr.point + amount;

    const updatedUserPoint = await this.userDb.insertOrUpdate(
      userId,
      updatedPoint,
    );
    await this.historyDb.insert(userId, amount, TransactionType.CHARGE, date);

    return updatedUserPoint;
  }

  // 특정 유저의 포인트 사용
  async useUserPoint(
    userId: number,
    amount: number,
    date: number,
  ): Promise<UserPoint> {
    const user = await this.userDb.selectById(userId);

    // 존재하는 유저 인지 확인
    if (this.isNotExistUser(user, user.updateMillis)) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.point < amount) {
      throw new BadRequestException('Insufficient points');
    }

    const updatedPoint = user.point - amount;

    const updatedUserPoint = await this.userDb.insertOrUpdate(
      userId,
      updatedPoint,
    );
    await this.historyDb.insert(userId, -amount, TransactionType.USE, date);

    return updatedUserPoint;
  }

  // 새로운 유저인지 (테이블에서 반환된 기본값을 판별)
  private isNotExistUser(user: UserPoint, date: number): boolean {
    return user.point === 0 && user.updateMillis === date;
  }
}
