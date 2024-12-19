import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { PointBody as PointDto } from './point.dto';
import { PointService } from './point.service';

@Controller('/point')
export class PointController {
  constructor(readonly pointService: PointService) {}

  /**
   * TODO - 특정 유저의 포인트를 조회하는 기능을 작성해주세요.
   */
  @Get(':id')
  async point(@Param('id') id): Promise<UserPoint> {
    const userId = Number.parseInt(id);

    if (isNaN(userId) || userId <= 0) {
      throw new BadRequestException('Invalid userId');
    }
    return this.pointService.getUserPoint(userId);
  }

  /**
   * TODO - 특정 유저의 포인트 충전/이용 내역을 조회하는 기능을 작성해주세요.
   */
  @Get(':id/histories')
  async history(@Param('id') id): Promise<PointHistory[]> {
    const userId = Number.parseInt(id);
    if (isNaN(userId) || userId <= 0) {
      throw new BadRequestException('Invalid userId');
    }

    return this.pointService.getPointHistories(userId);
  }

  /**
   * TODO - 특정 유저의 포인트를 충전하는 기능을 작성해주세요.
   */
  @Patch(':id/charge')
  async charge(
    @Param('id') id,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<UserPoint> {
    const userId = Number.parseInt(id);

    if (isNaN(userId) || userId <= 0) {
      throw new BadRequestException('Invalid userId');
    }

    const { amount } = pointDto;

    // 충전 금액이 0 이하일 때 예외 처리
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return this.pointService.chargeUserPoint(userId, amount);
  }

  /**
   * TODO - 특정 유저의 포인트를 사용하는 기능을 작성해주세요.
   */
  @Patch(':id/use')
  async use(
    @Param('id') id,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<UserPoint> {
    const userId = Number.parseInt(id);

    if (isNaN(userId) || userId <= 0) {
      throw new BadRequestException('Invalid userId');
    }

    const { amount } = pointDto;

    // 사용 금액이 0 이하일 때 예외 처리
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return this.pointService.useUserPoint(userId, amount);
  }
}
