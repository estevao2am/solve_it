import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category';

@Injectable()
export class CategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCategory(data: CreateCategoryDto) {
    return await this.prismaService.category.create({
      data,
    });
  }

  async findAllCategories() {
    return await this.prismaService.category.findMany();
  }

  async findCategoryById(id: string) {
    const category = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(id: string, data: UpdateCategoryDto) {
    await this.findCategoryById(id);

    return await this.prismaService.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    await this.findCategoryById(id);

    return await this.prismaService.category.delete({
      where: { id },
    });
  }
}
