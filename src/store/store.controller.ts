import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../config/multer';
import { StoresService } from './store.service';
import { AuthGuard } from '../users/auth.guard';
import { CurrentUser } from '../users/decorator/current-user.decorator';
import { CreateStoreDto } from './dto/store';

@Controller('store')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  /**
   * Criar loja para o usuário autenticado
   */
  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profile_image', maxCount: 1 },
        { name: 'cover_image', maxCount: 1 },
      ],
      multerConfig,
    ),
  )
  async createStore(
    @Body() data: CreateStoreDto,
    @UploadedFiles()
    files: {
      profile_image?: Express.Multer.File[];
      cover_image?: Express.Multer.File[];
    },
    @CurrentUser() user: { sub: number },
  ) {
    return this.storesService.createStore(data, user.sub, files);
  }

  /**
   * Buscar a loja do usuário autenticado
   */
  @UseGuards(AuthGuard)
  @Get('me')
  async myStore(@CurrentUser() user: { sub: number }) {
    return this.storesService.findMyStore(user.sub);
  }

  /**
   * Buscar uma loja pelo ID
   */
  @UseGuards(AuthGuard)
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.findById(id);
  }
}
