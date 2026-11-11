# boopateway-web

Versão web (React) do POS **FacePay** ([boopateway-droid](https://github.com/boopsrc/boopateway-droid)): cobrança por reconhecimento facial, com as mesmas regras do app Android e animações guiadas.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
```

- `npm test` — testes unitários (porta dos testes do Android)
- `npm run build` — build de produção em `dist/`

## Docker

```bash
docker compose up -d --build   # http://localhost:31802
```

O build é servido pelo nginx padrão da imagem, sem configuração própria. Variáveis opcionais: `WEB_PORT`, e no build `VITE_API_URL` e `VITE_DEMO=true`.

## Backend

Copie `.env.example` para `.env`. O app chama o gateway direto em `VITE_API_URL` (padrão `http://192.168.0.7:31800`).

**Modo demo:** ligue na Home (ou `VITE_DEMO=true`). A API roda simulada no navegador: o PIN é `1234`, são 3 tentativas e e-mail duplicado é recusado. Sem câmera, use **Simular rosto** para ver todos os estados da guia facial.

## Fluxos

- **Pagamento:** Valor → Rosto → Processando → PIN → Resultado
- **Cadastro:** Dados → Foto → Envio
- **Testar captura:** mostra o recorte JPG que seria enviado

## Stack

Vite, React 19, TypeScript, React Router, Motion (animações), Zustand (sessões), MediaPipe Face Detector (BlazeFace, servido localmente de `public/`).
