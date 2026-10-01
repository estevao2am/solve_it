import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateProposalDto } from './dto/create-proposal.dto';
import { AuthGuard } from 'src/users/auth.guard';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';
import { ProposalsService } from './proposal.service';

@UseGuards(AuthGuard) // Protege todas as rotas da controller
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  // ========================================
  // CRIAR PROPOSTA
  // POST /proposals
  // ========================================
  @Post()
  async create(
    @CurrentUser() user: { sub: string },
    @Body() body: CreateProposalDto,
  ) {
    return this.proposalsService.create(user.sub, body);
  }

  // ========================================
  // VER AS MINHAS PROPOSTAS
  // GET /proposals/me
  // ========================================
  @Get('me')
  async findMyProposals(@CurrentUser() user: { sub: string }) {
    return this.proposalsService.findMyProposals(user.sub);
  }

  // ========================================
  // VER PROPOSTAS DE UM JOB
  // GET /proposals/job/:jobId
  // ========================================
  @Get('job/:jobId')
  async findByJob(@Param('jobId') jobId: string) {
    return this.proposalsService.findByJob(jobId);
  }

  // ========================================
  // ACEITAR PROPOSTA
  // PATCH /proposals/:id/accept
  // ========================================
  @Patch(':id/accept')
  async accept(
    @Param('id') proposalId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.proposalsService.accept(proposalId, user.sub);
  }

  // ========================================
  // RECUSAR PROPOSTA
  // PATCH /proposals/:id/reject
  // ========================================
  @Patch(':id/reject')
  async reject(
    @Param('id') proposalId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.proposalsService.reject(proposalId, user.sub);
  }

  // ========================================
  // VER UMA PROPOSTA POR ID
  // GET /proposals/:id
  // (Sempre por último)
  // ========================================
  @Get(':id')
  async findOne(@Param('id') proposalId: string) {
    return this.proposalsService.findOne(proposalId);
  }
}
