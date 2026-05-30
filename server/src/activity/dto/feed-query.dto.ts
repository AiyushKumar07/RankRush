import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PERIODS = ['today', '7d', '30d', '90d', 'all'] as const;
export type Period = (typeof PERIODS)[number];

export class FeedQueryDto {
  @IsOptional()
  @IsEnum(PERIODS)
  period?: Period;

  // CSV of ActivityCategory values: "QUIZ,RANK,TOKEN,BADGE,STREAK,PLAN,SOCIAL,SYSTEM"
  @IsOptional()
  @IsString()
  category?: string;

  // Opaque cursor — currently an ISO date from the last item's occurredAt.
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class StatsQueryDto {
  @IsOptional()
  @IsEnum(PERIODS)
  period?: Period;
}

export class RankHistoryQueryDto {
  @IsOptional()
  @IsEnum(PERIODS)
  period?: Period;

  // Defaults to the user's class-global scope. Pass a different scopeKey
  // (e.g. "JEE") to view rank progression in a specific scope.
  @IsOptional()
  @IsString()
  scopeKey?: string;

  @IsOptional()
  @IsString()
  scopeKind?: string;
}

export class HeatmapQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(28)
  @Max(730)
  days?: number = 364;
}

// Helper: translate a Period string into (startDate, endDate) bounds.
export function resolvePeriodBounds(period: Period | undefined): {
  start: Date | null;
  end: Date;
  days: number | null;
} {
  const end = new Date();
  if (!period || period === 'all') return { start: null, end, days: null };
  const map: Record<Exclude<Period, 'all'>, number> = {
    today: 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  const days = map[period];
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  start.setHours(0, 0, 0, 0);
  return { start, end, days };
}

