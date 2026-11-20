import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChallengeRequestDto {
  @ApiProperty({ description: 'Stellar Ed25519 Public Key (G...)', example: 'GCPZAXFI45FYYEG25SDJYI7EP7PR67EV2M24CGT6KJOHUBSEEYF5E36M' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, { message: 'Invalid Stellar public address format' })
  walletAddress: string;
}

export class ChallengeResponseDto {
  @ApiProperty({ description: 'Cryptographic challenge message to be signed by the wallet' })
  message: string;

  @ApiProperty({ description: 'Challenge expiration timestamp in milliseconds' })
  expiresAt: number;
}

export class VerifySignatureDto {
  @ApiProperty({ description: 'Stellar Ed25519 Public Key (G...)' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({ description: 'Base64 encoded Ed25519 signature of the challenge message' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Challenge message that was signed' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token' })
  accessToken: string;

  @ApiProperty({ description: 'Authenticated wallet address' })
  walletAddress: string;
}
