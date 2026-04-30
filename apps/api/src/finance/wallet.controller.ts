import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SePayWebhookDto } from './sepay-webhook.dto';
import { SePayWebhookAuthGuard } from './sepay-webhook.guard';
import { WalletService } from './wallet.service';

@Controller('api/webhooks')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('sepay')
  @UseGuards(SePayWebhookAuthGuard)
  async handleSePayWebhook(
    @Req() req: { body?: Record<string, unknown> },
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    body: SePayWebhookDto,
  ) {
    const rawBody = (req.body ?? (body as unknown as Record<string, unknown>)) as unknown as Prisma.InputJsonValue;
    return this.walletService.handleSePayWebhook(body, rawBody);
  }
}
