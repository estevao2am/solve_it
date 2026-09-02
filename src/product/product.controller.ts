import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product';
import { CurrentUser } from '../users/decorator/current-user.decorator';
import { AuthGuard } from '../users/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../config/multer';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async createProduct(
    @Body() data: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string },
  ) {
    return this.productService.createProduct(data, user.sub, file);
  }
  @Get()
  async findAllProducts(@Query('page') page = '1') {
    return this.productService.findAllProducts(Number(page));
  }

  @Get(':id')
  async findProductById(@Param('id', ParseIntPipe) id: string) {
    return await this.productService.findProductById(id);
  }

  @Patch(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: string,
    @Body() body: UpdateProductDto,
  ) {
    return await this.productService.updateProduct(id, body);
  }

  @Delete(':id')
  async deleteProduct(@Param('id', ParseIntPipe) id: string) {
    return await this.productService.deleteProduct(id);
  }

  @Get('store/:storeId')
  async findProductsByStoreId(
    @Param('storeId', ParseIntPipe) storeId: string,
    @Query('page') page = '1',
  ) {
    return await this.productService.findProductsByStoreId(
      storeId,
      Number(page),
    );
  }
}
