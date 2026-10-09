# 🍰 Bolos Caseirinhos

Aplicação web e-commerce para catálogo e encomenda de bolos artesanais e de pote, integrada com **Mercado Pago (PIX com QR Code dinâmico)** e banco de dados **Supabase**.

---

## 🚀 Funcionalidades

- **Catálogo Interativo**: Exibição dos produtos com alternância entre visualização em **Lista** e **Galeria / Grade**.
- **Carrinho Dinâmico**: Controle de quantidade (`+` / `-`) com cálculo automático de subtotais e valor total do pedido.
- **Modal de Checkout Completo**: Coleta de dados do comprador e endereço de entrega.
- **Pagamento com PIX Transparente**: Geração em tempo real do **QR Code em imagem** e do código **PIX Copia e Cola** via API do Mercado Pago.
- **Persistência de Pedidos**: Gravação automática do pedido, dados do comprador e lista de bolos no banco de dados **Supabase**.
- **Webhooks**: Endpoint pronto para receber confirmação de pagamento e atualizar o status do pedido para `pago`.

---

## 📁 Estrutura do Projeto

```plaintext
bolodadanih/
├── index.html              # Interface principal do catálogo e checkout
├── app.js                  # Lógica de interface, carrinho e chamadas de API
├── style.css               # Estilos responsivos e temas
├── schema.sql              # Script SQL para criação da tabela 'pedidos' no Supabase
├── img/                    # Imagens dos bolos do catálogo
├── backend/
│   ├── server.js           # API Node.js / Express (Mercado Pago + Supabase)
│   ├── package.json        # Dependências do backend
│   └── .env.example        # Exemplo de configuração de variáveis de ambiente
└── .gitignore              # Proteção contra envio de arquivos sensíveis (.env)
```

---

## 🛠️ Tecnologias Utilizadas

- **Front-end**: HTML5, CSS3 moderno (Flexbox, Grid), JavaScript Vanilla (ES6+).
- **Back-end**: Node.js, Express, Cors, Dotenv.
- **Pagamentos**: SDK oficial do Mercado Pago (`mercadopago`).
- **Banco de Dados**: Supabase (`@supabase/supabase-js`, PostgreSQL).

---

## ⚙️ Como Executar Localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) instalado.
- Conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers).
- Projeto criado no [Supabase](https://supabase.com).

### 2. Configuração do Banco de Dados (Supabase)
1. Acesse o **SQL Editor** do seu painel no Supabase.
2. Copie e execute o conteúdo do arquivo [`schema.sql`](schema.sql).

### 3. Configuração do Backend
1. Entre na pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` baseado no `.env.example`:
   ```env
   PORT=3000
   MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SECRET_KEY=sua_service_role_key_aqui
   ```
4. Inicie o servidor:
   ```bash
   node server.js
   ```
   O servidor estará rodando em `http://localhost:3000`.

### 4. Executar o Front-end
Abra o arquivo [`index.html`](index.html) diretamente no seu navegador ou utilize a extensão **Live Server** do VS Code.

---

## 🔒 Segurança

As credenciais do `.env` e pastas como `node_modules/` estão protegidas pelo `.gitignore` e não são versionadas no repositório.
