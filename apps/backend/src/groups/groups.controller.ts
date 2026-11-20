import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, RegisterMemberDto, JoinWithInviteDto, AcceptRulesDto } from './dto/groups.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Savings Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new savings circle' })
  async createGroup(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user.walletAddress, dto);
  }

  @Get('my-circles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all savings circles for authenticated user' })
  async getMyCircles(@CurrentUser() user: AuthUser) {
    return this.groupsService.getMyCircles(user.walletAddress);
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Get group details by public invitation token' })
  async getGroupByInvite(@Param('token') token: string) {
    return this.groupsService.getGroupByInviteToken(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full savings circle details by ID' })
  async getGroupById(@Param('id') id: string) {
    return this.groupsService.getGroupById(id);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Organizer registers a member' })
  async registerMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterMemberDto,
  ) {
    return this.groupsService.registerMember(id, user.walletAddress, dto);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a group using an invitation token' })
  async joinWithInvite(@CurrentUser() user: AuthUser, @Body() dto: JoinWithInviteDto) {
    return this.groupsService.joinWithInvite(user.walletAddress, dto);
  }

  @Post(':id/accept-rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Member accepts group rules' })
  async acceptRules(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.acceptRules(id, user.walletAddress);
  }
}
