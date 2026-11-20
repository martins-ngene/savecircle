import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Contribution Schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get full contribution and payout schedule for a savings group' })
  async getGroupSchedule(@Param('groupId') groupId: string) {
    return this.schedulesService.getGroupSchedule(groupId);
  }

  @Get('my-obligations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upcoming and overdue contribution obligations for logged in member' })
  async getMyObligations(@CurrentUser() user: AuthUser) {
    return this.schedulesService.getUpcomingObligations(user.walletAddress);
  }
}
