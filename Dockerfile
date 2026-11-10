# ---------- Build: gera dist/ (o prebuild copia o wasm do MediaPipe para public/)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_DEMO=false
ENV VITE_DEMO=$VITE_DEMO
RUN npm run build

# ---------- Runtime: nginx serve o SPA e repassa /api para o gateway
FROM nginx:1.27-alpine
ENV API_TARGET=http://host.docker.internal:31800
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
