import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
