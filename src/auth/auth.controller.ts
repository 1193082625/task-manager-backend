import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { type AuthenticatedRequest } from './jwt-auth.guard.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { Public } from './public.decorator.js';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机号和密码登录' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ description: '请求参数不合法' })
  @ApiUnauthorizedResponse({ description: '手机号或密码错误' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已失效' })
  getCurrentUser(
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(request.user.sub);
  }
}
