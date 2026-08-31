import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Serviço global do Prisma ORM, compatível com Prisma 7.
 *
 * No Prisma 7, o PrismaClient obrigatoriamente precisa de um adapter ou accelerateUrl.
 * Utilizamos o @prisma/adapter-pg com um Pool do 'pg' para conexão direta ao PostgreSQL.
 *
 * Registrado como @Global() via PrismaModule — evita múltiplas instâncias na aplicação.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService) {
    const connection_string = config.get<string>('DATABASE_URL');

    if (!connection_string) {
      throw new Error('Variável de ambiente DATABASE_URL não definida no .env');
    }

    // Cria o pool de conexões PostgreSQL
    const pool = new Pool({ connectionString: connection_string });

    // Adapter obrigatório no Prisma 7 para conexão direta via driver
    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleInit() {
    this.logger.log('Conectando ao banco de dados...');
    await this.$connect();
    this.logger.log('Banco de dados conectado com sucesso.');
  }

  async onModuleDestroy() {
    this.logger.log('Encerrando conexão com o banco de dados...');
    await this.$disconnect();
    this.logger.log('Conexão encerrada.');
  }
}
