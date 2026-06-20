FROM composer:latest AS composer
COPY composer.json composer.lock /app/
RUN composer install --no-interaction --working-dir=/app

FROM php:8.4-fpm-alpine

RUN apk add --no-cache --virtual .build-deps autoconf make g++ && \
    docker-php-ext-install mysqli && \
    docker-php-ext-enable mysqli && \
    pecl install apcu && \
    docker-php-ext-enable apcu && \
    apk del .build-deps

COPY config/php/zz-opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY config/php-fpm/zz-www.conf /usr/local/etc/php-fpm.d/zz-www.conf

COPY . /var/www/html/
COPY --from=composer /app/vendor /var/www/html/vendor
COPY --from=composer /app/composer.lock /var/www/html/composer.lock

RUN rm -rf \
    /var/www/html/node_modules \
    /var/www/html/bun.lock \
    /var/www/html/bunfig.toml \
    /var/www/html/package* \
    /var/www/html/.prettierrc \
    /var/www/html/README.md \
    /var/www/html/AGENTS.md \
    /var/www/html/contexto.md \
    /var/www/html/.env.example \
    /var/www/html/specs.md \
    /var/www/html/pv_reconcile.php \
    /var/www/html/tailwind.config.js

RUN mkdir -p /var/www/html/OS /var/www/html/LAUDO && \
    chown -R www-data:www-data /var/www/html/OS /var/www/html/LAUDO

RUN touch /var/www/html/.env && \
    chmod 600 /var/www/html/.env && \
    chown www-data:www-data /var/www/html/.env
