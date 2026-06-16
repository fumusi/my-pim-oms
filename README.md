# my-pim-oms

## Requirements
- Node >= 22.13
- Docker

## Setup

### 1. Start database
```bash
docker compose up -d
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp apps/api/.env.example apps/api/.env
```

### 4. Run migrations
```bash
cd apps/api
npm run migration:run
```

### 5. Start BE
```bash
cd apps/api
npm run dev
```

### 6. Start FE
```bash
cd apps/web
npm run dev
```
