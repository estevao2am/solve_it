import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/category';
import { multerConfig } from 'src/config/multer';

@Controller('categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Post('/')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'imageUrl', maxCount: 1 }], multerConfig),
  )
  async createCategory(
    @Body() data: CreateCategoryDto,
    @UploadedFiles()
    files: {
      imageUrl?: Express.Multer.File[];
    },
  ) {
    return await this.categoryService.createCategory(data, files);
  }

  @Get('/')
  async getAllAcategories() {
    return await this.categoryService.GetAllCategories();
  }
}
