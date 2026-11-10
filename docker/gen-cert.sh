#!/bin/sh
# Gera um certificado autoassinado se nenhum foi montado em /etc/nginx/certs.
set -e
dir=/etc/nginx/certs
if [ ! -f "$dir/cert.pem" ] || [ ! -f "$dir/key.pem" ]; then
  mkdir -p "$dir"
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -subj "/CN=boopateway-web" \
    -keyout "$dir/key.pem" -out "$dir/cert.pem" >/dev/null 2>&1
  echo "gen-cert: certificado autoassinado criado em $dir"
fi
