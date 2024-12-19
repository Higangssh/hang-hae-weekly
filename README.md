## 1. 동시성 제어 개요

`async-lock` 라이브러리를 사용하여 사용자 포인트에 대한 동시 작업을 관리합니다. 각 작업(예: 포인트 충전 또는 사용)은 사용자별로 잠금이 걸리며, 한 번에 하나의 요청만 처리되도록 보장합니다.

## 2. 구현 세부 사항

### 주요 구성 요소

**잠금 메커니즘**:

- `AsyncLock` 인스턴스를 사용하여 동일한 사용자에 대한 작업이 순차적으로 실행되도록 합니다.
- 각 사용자는 사용자 ID(`user-<userId>`)를 기반으로 고유한 잠금 키를 할당받습니다.

### 포인트 충전 (`chargeUserPoint`)

```typescript
async chargeUserPoint(userId: number, amount: number): Promise<UserPoint> {
  return this.lock.acquire(`user-${userId}`, async () => {
    const user = await this.userDb.selectById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

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
```

### 포인트 사용 (`useUserPoint`)

```typescript
async useUserPoint(userId: number, amount: number): Promise<UserPoint> {
  return this.lock.acquire(`user-${userId}`, async () => {
    const user = await this.userDb.selectById(userId);

    if (!user) {
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
    await this.historyDb.insert(
      userId,
      -amount,
      TransactionType.USE,
      updatedUserPoint.updateMillis,
    );

    return updatedUserPoint;
  });
}
```

## 3. 잠재적 고려 사항

- `async-lock` 라이브러리는 순차 실행을 보장하지만, 작업 시간이 길어지면 동일 사용자에 대한 후속 요청이 지연될 수 있습니다.
- 분산환경에서의 동시성 처리를 고려하지 않은 설계입니다.

## 4. 대안

- **분산 잠금**:
  - Redis와 같은 중앙 집중식 저장소를 사용한 잠금 메커니즘(Redlock)을 고려할 수 있습니다.
  - 이를 통해 다중 서버 환경에서도 동시성 제어를 보장할 수 있습니다.

## 4. 결론

`PointService` 클래스의 동시성 제어 메커니즘은 `async-lock` 라이브러리를 활용하여 단일 서버에서의 데이터 일관성과 스레드 안전성을 보장합니다.
