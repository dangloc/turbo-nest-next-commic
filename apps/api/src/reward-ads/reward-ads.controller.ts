import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth';
import { RewardAdsService } from './reward-ads.service';

@Controller('reward-ads')
@UseGuards(RolesGuard)
@Roles('USER', 'AUTHOR', 'ADMIN')
export class RewardAdsController {
  constructor(private readonly rewardAdsService: RewardAdsService) {}

  @Post('sessions')
  async createSession(@Req() req: { user?: { id: number } }) {
    return this.rewardAdsService.createSession(req.user?.id as number);
  }

  @Post('claim')
  async claim(
    @Req() req: { user?: { id: number } },
    @Body() body: { sessionId?: string },
  ) {
    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    return this.rewardAdsService.claimSession(req.user?.id as number, sessionId);
  }
}

