import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './job.service';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';
import { AuthGuard } from 'src/users/auth.guard';

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
}
