FROM php:8.4-fpm-alpine AS base

RUN apk add --update \
    $PHPIZE_DEPS \
    nodejs \
    npm \
    unzip

RUN pecl install redis
RUN apk --no-cache add procps

RUN docker-php-ext-install pdo_mysql pcntl
RUN docker-php-ext-enable redis

RUN npm install -g pm2

WORKDIR /var/www/html

RUN addgroup -g 1000 -S dev
RUN adduser -G dev -u 1000 dev -D

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

FROM base AS build-fpm

COPY /project /var/www/html

# --no-scripts: the app is not bootable at build time (no .env yet); entry-point.sh
# runs `composer dump-autoload` + `artisan optimize` once the environment is present.
RUN composer install --prefer-dist --no-ansi --no-dev --no-interaction --no-scripts

FROM build-fpm AS develop

COPY /ops/docker/fpm/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY /ops/docker/fpm/user.ini /usr/local/etc/php/conf.d/user.ini

RUN mkdir -p /var/log/php-fpm && chown www-data:www-data /var/log/php-fpm

RUN chmod +x /var/www/html/entry-point.sh

RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

ENTRYPOINT ["./entry-point.sh"]

FROM develop AS production

RUN docker-php-ext-install opcache

RUN docker-php-ext-configure opcache --enable-opcache

# Production: skip per-request mtime checks for max performance
# (overrides the dev-friendly validate_timestamps=1 from user.ini)
RUN echo "opcache.validate_timestamps=0" > /usr/local/etc/php/conf.d/zz-opcache-prod.ini
