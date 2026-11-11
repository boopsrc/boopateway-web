# boopateway-web

Versão web (React) do POS **FacePay** ([boopateway-droid](https://github.com/boopsrc/boopateway-droid)): cobrança por reconhecimento facial, com as mesmas regras do app Android e animações guiadas.

## Rodando

```bash
npm install
npm run dev        # https://localhost:5173 (HTTPS para a câmera no celular)
```

- `npm test` — testes unitários (porta dos testes do Android)
- `npm run build` — build de produção em `dist/`

## Docker

```bash
docker compose up -d --build   # http://localhost:31802
```

nginx serve o build e repassa `/api/*` para `API_TARGET` (padrão `http://host.docker.internal:31800`, o gateway no host). Variáveis opcionais: `WEB_PORT`, `WEB_HTTPS_PORT`, `API_TARGET` e `VITE_DEMO=true` (este no build).

**Câmera no celular:** o navegador só pede a permissão em `localhost` ou HTTPS. O container também serve HTTPS em `https://<ip>:31803` (certificado autoassinado gerado na subida; aceite o aviso no celular) e redireciona para lá quem abre `http://<ip>:31802`. Para usar um certificado próprio, monte `cert.pem` e `key.pem` em `/etc/nginx/certs`. Em dev, o Vite já sobe em HTTPS (`VITE_HTTPS=false` desliga).

## Backend

Copie `.env.example` para `.env`. O Vite repassa `/api/*` para `VITE_API_TARGET` (padrão `https://apipay.depois.click`), evitando CORS.

**Modo demo:** ligue na Home (ou `VITE_DEMO=true`). A API roda simulada no navegador: o PIN é `1234`, são 3 tentativas e e-mail duplicado é recusado. Sem câmera, use **Simular rosto** para ver todos os estados da guia facial.

## Fluxos

- **Pagamento:** Valor → Rosto → Processando → PIN → Resultado
- **Cadastro:** Dados → Foto → Envio
- **Testar captura:** mostra o recorte JPG que seria enviado

## Stack

Vite, React 19, TypeScript, React Router, Motion (animações), Zustand (sessões), MediaPipe Face Detector (BlazeFace, servido localmente de `public/`).
