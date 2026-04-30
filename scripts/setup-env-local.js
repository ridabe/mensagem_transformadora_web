const fs = require("fs");
const path = require("path");

const examplePath = path.join(process.cwd(), ".env.example");
const localPath = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(examplePath)) {
  console.error("Arquivo .env.example não encontrado. Crie-o antes de rodar este script.");
  process.exit(1);
}

if (fs.existsSync(localPath)) {
  console.log("Já existe um arquivo .env.local. Nenhuma ação foi tomada.");
  process.exit(0);
}

fs.copyFileSync(examplePath, localPath);
console.log("Arquivo .env.local criado com base em .env.example.");
console.log("Edite .env.local e preencha os valores reais antes de rodar o projeto.");
