import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './job.service';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';
import { AuthGuard } from 'src/users/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/config/multer';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(user.sub, dto);
  }

  @Get()
  async findAll() {
    return this.jobsService.findAll();
  }
  @UseGuards(AuthGuard)
  @Get('my-jobs')
  async getMyJobs(@CurrentUser() user: { sub: string }) {
    return this.jobsService.getMyJobs(user.sub);
  }

  // Novos pedidos para o profissional autenticado enviar propostas
  @UseGuards(AuthGuard)
  @Get('available')
  async getAvailableJobs(@CurrentUser() user: { sub: string }) {
    return this.jobsService.getAvailableJobs(user.sub);
  }

  // Trabalhos atribuídos ao profissional autenticado
  @UseGuards(AuthGuard)
  @Get('assigned')
  async getAssignedJobs(@CurrentUser() user: { sub: string }) {
    return this.jobsService.getAssignedJobs(user.sub);
  }

  // Profissional: PAID → IN_PROGRESS
  @UseGuards(AuthGuard)
  @Patch(':jobId/start')
  async start(
    @CurrentUser() user: { sub: string },
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.start(jobId, user.sub);
  }

  // Profissional: IN_PROGRESS → AWAITING_CONFIRMATION
  @UseGuards(AuthGuard)
  @Patch(':jobId/mark-done')
  async markDone(
    @CurrentUser() user: { sub: string },
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.markDone(jobId, user.sub);
  }

  // Cliente: AWAITING_CONFIRMATION → COMPLETED (liberta o pagamento)
  @UseGuards(AuthGuard)
  @Patch(':jobId/confirm-completion')
  async confirmCompletion(
    @CurrentUser() user: { sub: string },
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.confirmCompletion(jobId, user.sub);
  }

  @UseGuards(AuthGuard)
  @Post(':jobId/images')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadImage(
    @CurrentUser() user: { sub: string },
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('É necessário enviar uma imagem');
    }

    return this.jobsService.uploadImage(jobId, user.sub, file);
  }
}
