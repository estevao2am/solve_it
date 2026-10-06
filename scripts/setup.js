/**
 * Prepara e arranca o projecto num só comando:
 *
 *   npm run setup
 *
 * 1. Verifica o Node e o Docker
 * 2. Cria o .env a partir do .env.example (com um JWT_SECRET aleatório)
 * 3. Instala as dependências (npm ci)
 * 4. Sobe os containers (postgres e mailpit) e espera que fiquem prontos
 * 5. Gera o Prisma Client e aplica as migrações
 * 6. Arranca a API em modo dev
 *
 * Pode ser corrido várias vezes: os passos já feitos não estragam nada.
 */
const { execSync, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIN_NODE_MAJOR = 20;

function step(title) {
  console.log(`\n\x1b[36m▶ ${title}\x1b[0m`);
}

function fail(message) {
  console.error(`\n\x1b[31m✖ ${message}\x1b[0m\n`);
  process.exit(1);
}

function run(command) {
  console.log(`$ ${command}`);
  try {
    execSync(command, { cwd: ROOT, stdio: 'inherit' });
  } catch {
    fail(`O comando falhou: ${command}`);
  }
}

function succeeds(command) {
  try {
    execSync(command, { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkPrerequisites() {
  step('A verificar pré-requisitos');

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < MIN_NODE_MAJOR) {
    fail(`É preciso Node ${MIN_NODE_MAJOR} ou superior (tens ${process.version}).`);
  }

  if (!succeeds('docker compose version')) {
    fail('Docker Compose não encontrado. Instala o Docker Desktop.');
  }

  if (!succeeds('docker info')) {
    fail('O Docker não está a correr. Abre o Docker Desktop e tenta outra vez.');
  }

  console.log(`Node ${process.version} e Docker OK`);
}

function createEnvFile() {
  step('A preparar o .env');

  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    console.log('.env já existe — mantido sem alterações');
    return;
  }

  const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(
    envPath,
    example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${secret}"`),
  );

  console.log('.env criado a partir do .env.example (JWT_SECRET gerado)');
  console.log('Preenche as chaves da Cloudinary no .env para o upload de imagens.');
}

function installDependencies() {
  step('A instalar dependências');

  // O package-lock.json foi gerado com npm 11; o npm 10 rejeita-o no `npm ci`
  const npmMajor = Number(
    execSync('npm -v', { cwd: ROOT }).toString().trim().split('.')[0],
  );
  run(npmMajor >= 11 ? 'npm ci' : 'npx -y npm@11 ci');
}

function startContainers() {
  step('A subir os containers (postgres e mailpit)');
  run('docker compose up -d --wait postgres mailpit');
}

function setupDatabase() {
  step('A gerar o Prisma Client e aplicar as migrações');
  run('npx prisma generate');
  run('npx prisma migrate deploy');
}

function startApi() {
  step('A arrancar a API (Ctrl+C para parar)');
  console.log('API:     http://localhost:3001');
  console.log('Mailpit: http://localhost:8025\n');

  const child = spawn('npm', ['run', 'start:dev'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

checkPrerequisites();
createEnvFile();
installDependencies();
startContainers();
setupDatabase();
startApi();
