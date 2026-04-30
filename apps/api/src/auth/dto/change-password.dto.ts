import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/[A-Za-z]/, {
    message: 'newPassword must contain at least one letter',
  })
  @Matches(/\d/, {
    message: 'newPassword must contain at least one number',
  })
  newPassword!: string;
}
