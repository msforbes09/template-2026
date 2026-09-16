FROM nginx:1.25.4-alpine AS base

RUN apk update && apk upgrade --no-cache

WORKDIR /var/www/html

FROM base AS develop

COPY ./ops/docker/nginx/default.dev.conf /etc/nginx/conf.d/default.conf
COPY ./ops/docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./project /var/www/html/

FROM develop AS production

COPY ./ops/docker/nginx/default.conf /etc/nginx/conf.d/default.conf
