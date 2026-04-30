import { Injectable, Logger } from '@nestjs/common';

export interface WelcomeEmailInput {
  id: number;
  email: string;
  username: string;
}

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  async sendWelcomeEmail(user: WelcomeEmailInput): Promise<void> {
    this.logger.log(
      `Welcome email prepared for user ID: ${user.id} (${user.email})`,
    );
  }
}
