import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
