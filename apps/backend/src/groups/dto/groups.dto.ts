import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Matches } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ description: 'Group name', example: 'Lagos Tech Savings Circle' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Detailed description and purpose of the savings group' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Contribution amount per member in USDC (e.g. 100)' })
  @IsString()
  @IsNotEmpty()
  contributionAmount: string;

  @ApiProperty({ description: 'Total number of members', example: 5 })
  @IsNumber()
  @Min(2)
  totalMembers: number;

  @ApiPropertyOptional({ description: 'Payment frequency: WEEKLY, BIWEEKLY, MONTHLY', default: 'MONTHLY' })
  @IsString()
  @IsOptional()
  paymentFrequency?: string;

  @ApiPropertyOptional({ description: 'Cycle duration in days', default: 30 })
  @IsNumber()
  @IsOptional()
  cycleDurationDays?: number;

  @ApiPropertyOptional({ description: 'Required approval threshold for withdrawals', default: 3 })
  @IsNumber()
  @IsOptional()
  approvalThreshold?: number;

  @ApiPropertyOptional({ description: 'Payout model: ROTATING, FIXED, VARIABLE', default: 'ROTATING' })
  @IsString()
  @IsOptional()
  payoutModel?: string;

  @ApiProperty({ description: 'Group charter, rules, and mutual accountability agreement' })
  @IsString()
  @IsNotEmpty()
  rules: string;

  @ApiPropertyOptional({ description: 'Confirmed on-chain group ID from Soroban contract', example: 1 })
  @IsNumber()
  @IsOptional()
  onChainGroupId?: number;
}

export class RegisterMemberDto {
  @ApiProperty({ description: 'Stellar wallet address of the invited member' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, { message: 'Invalid Stellar public address format' })
  walletAddress: string;

  @ApiPropertyOptional({ description: 'Display name of the member' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ description: 'Rotation position in payout schedule (1 to N)', example: 1 })
  @IsNumber()
  @Min(1)
  rotationPosition: number;
}

export class AcceptRulesDto {
  @ApiProperty({ description: 'Member wallet address' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class JoinWithInviteDto {
  @ApiProperty({ description: 'Unique group invitation token' })
  @IsString()
  @IsNotEmpty()
  inviteToken: string;

  @ApiPropertyOptional({ description: 'Display name for the registering member' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ description: 'Desired rotation position (1 to N)', example: 2 })
  @IsNumber()
  @Min(1)
  rotationPosition: number;
}
