FROM php:8.4-apache

RUN docker-php-ext-install mysqli && \
    docker-php-ext-enable mysqli

RUN pecl install apcu && \
    docker-php-ext-enable apcu

RUN a2enmod rewrite && a2enmod headers

COPY config/apache/site.conf /etc/apache2/sites-available/000-default.conf

COPY . /var/www/html/

RUN rm -rf \
    /var/www/html/node_modules \
    /var/www/html/vendor \
    /var/www/html/tests \
    /var/www/html/bun.lock \
    /var/www/html/bunfig.toml \
    /var/www/html/phpunit.xml \
    /var/www/html/composer.* \
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
