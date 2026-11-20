import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChallengeRequestDto, ChallengeResponseDto, VerifySignatureDto, AuthResponseDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request wallet authentication challenge nonce' })
  @ApiResponse({ status: 200, type: ChallengeResponseDto })
  async requestChallenge(@Body() dto: ChallengeRequestDto): Promise<ChallengeResponseDto> {
    return this.authService.generateChallenge(dto.walletAddress);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Ed25519 signature and obtain JWT session token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifySignature(@Body() dto: VerifySignatureDto): Promise<AuthResponseDto> {
    return this.authService.verifySignature(dto.walletAddress, dto.signature, dto.message);
  }
}
