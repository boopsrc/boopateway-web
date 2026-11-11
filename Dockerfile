# ---------- Build: gera dist/ (o prebuild copia o wasm do MediaPipe para public/)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://192.168.0.7:31800
ARG VITE_DEMO=false
ENV VITE_API_URL=$VITE_API_URL VITE_DEMO=$VITE_DEMO
RUN npm run build

# ---------- Runtime: nginx padrão servindo os arquivos estáticos
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
