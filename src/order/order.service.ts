import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private readonly prismaService: PrismaService) {}

  // ============================================
  // CRIAR ORDER / CARRINHO
  // ============================================

  async createOrder(userId: number) {
    // Verificar se já existe um carrinho
    // aberto para este usuário
    const existingCart = await this.prismaService.order.findFirst({
      where: {
        user_id: userId,
        status: OrderStatus.CART,
      },
    });

    if (existingCart) {
      throw new ConflictException('Você já possui um carrinho ativo');
    }

    // Criar o carrinho
    const order = await this.prismaService.order.create({
      data: {
        user_id: userId,
        total: 0,
        status: OrderStatus.CART,
      },

      include: {
        order_stores: {
          include: {
            store: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return order;
  }

  async getMyCart(userId: number) {
    const cart = await this.prismaService.order.findFirst({
      where: {
        user_id: userId,
        status: OrderStatus.CART,
      },

      include: {
        order_stores: {
          include: {
            store: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Você não possui um carrinho ativo');
    }

    return cart;
  }

  async addItem(userId: number, productId: number, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantidade inválida');
    }

    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        'Quantidade solicitada maior que o estoque',
      );
    }

    const cart = await this.prismaService.order.findFirst({
      where: {
        user_id: userId,
        status: OrderStatus.CART,
      },
    });

    if (!cart) {
      throw new NotFoundException('Você não possui um carrinho ativo');
    }

    // Find or create the OrderStore for this product's store
    let orderStore = await this.prismaService.orderStore.findFirst({
      where: {
        order_id: cart.id,
        store_id: product.store_id,
      },
    });

    if (!orderStore) {
      orderStore = await this.prismaService.orderStore.create({
        data: {
          order_id: cart.id,
          store_id: product.store_id,
          subtotal: 0,
        },
      });
    }

    // Find existing item in this orderStore
    const existingItem = await this.prismaService.orderItem.findFirst({
      where: {
        order_store_id: orderStore.id,
        product_id: product.id,
      },
    });

    const itemTotal = product.price * quantity;

    if (existingItem) {
      await this.prismaService.orderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });
    } else {
      await this.prismaService.orderItem.create({
        data: {
          order_store_id: orderStore.id,
          product_id: product.id,
          quantity,
          unit_price: product.price,
        },
      });
    }

    // Update subtotals
    await this.prismaService.orderStore.update({
      where: { id: orderStore.id },
      data: {
        subtotal: { increment: itemTotal },
      },
    });

    await this.prismaService.order.update({
      where: { id: cart.id },
      data: {
        total: { increment: itemTotal },
      },
    });

    // Return updated cart with included relations
    return this.prismaService.order.findUnique({
      where: { id: cart.id },
      include: {
        order_stores: {
          include: {
            store: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async getAllOrders(page = 1) {
    const limit = 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prismaService.order.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: true,
          order_stores: {
            include: {
              store: true,
              items: {
                include: { product: true },
              },
            },
          },
        },
      }),

      this.prismaService.order.count(),
    ]);

    // Recalculate subtotals and totals from items to ensure consistency
    const normalized = orders.map((o) => {
      const order = JSON.parse(JSON.stringify(o));

      let orderTotal = 0;

      if (order.order_stores && Array.isArray(order.order_stores)) {
        order.order_stores = order.order_stores.map((os: any) => {
          let subtotal = 0;

          if (os.items && Array.isArray(os.items)) {
            subtotal = os.items.reduce(
              (sum: number, it: any) => sum + it.unit_price * it.quantity,
              0,
            );
          }

          orderTotal += subtotal;

          return {
            ...os,
            subtotal,
          };
        });
      }

      order.total = orderTotal;

      return order;
    });

    return {
      data: normalized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }
  async findOrderById(id: number) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: {
        user: true,
        order_stores: {
          include: {
            store: true,
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return order;
  }
}

// TODO: Implementar a função de remover item do carrinho
// TODO: Implementar a função de atualizar quantidade do item no carrinho
// TODO: Implementar a função de finalizar o pedido (checkout)
// TODO: Implementar a função de listar pedidos do usuário
// TODO: Implementar a função de listar detalhes de um pedido específico
// TODO: Implementar a função de cancelar um pedido
// TODO: Implementar a função de listar pedidos de uma loja (para o dono da loja)
// TODO: Implementar a função de atualizar status do pedido (para o dono da loja)
// TODO: Implementar a função de calcular o subtotal de cada loja e o total do pedido
// TODO: Implementar a função de aplicar cupom de desconto ao pedido
// TODO: Implementar a função de calcular o frete do pedido
// TODO: Implementar a função de Transação de pagamento (integração com gateway de pagamento)
// TODO: Implementar a função de descrementar o estoque do produto quando o pedido for finalizado
