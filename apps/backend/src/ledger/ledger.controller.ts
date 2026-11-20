import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Member & Group Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('group/:groupId/my-ledger')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get financial ledger for authenticated member in a group' })
  async getMyLedger(@Param('groupId') groupId: string, @CurrentUser() user: AuthUser) {
    return this.ledgerService.getMemberLedger(groupId, user.walletAddress);
  }

  @Get('group/:groupId/member/:walletAddress')
  @ApiOperation({ summary: 'Get transparent financial ledger for any member in a group' })
  async getMemberLedger(
    @Param('groupId') groupId: string,
    @Param('walletAddress') walletAddress: string,
  ) {
    return this.ledgerService.getMemberLedger(groupId, walletAddress);
  }

  @Get('group/:groupId/summary')
  @ApiOperation({ summary: 'Get full accounting and balance reconciliation summary for a group' })
  async getGroupSummary(@Param('groupId') groupId: string) {
    return this.ledgerService.getGroupLedgerSummary(groupId);
  }
}
