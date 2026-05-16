import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('api')
@SkipThrottle()
export class HealthController {
  @Get('health')
  health() {
    return {
      raw: {
        success: true,
        message: 'RankRush API is running',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
