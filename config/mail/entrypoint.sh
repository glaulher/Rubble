#!/bin/sh
# Rubble mail receiver entrypoint: gera credenciais/config local, sobe Postfix + Dovecot
set -eu

: "${MAIL_DOMAIN:?MAIL_DOMAIN required}"
: "${MAIL_USER:?MAIL_USER required}"
: "${MAIL_PASSWORD:?MAIL_PASSWORD required}"

FULL_ADDR="${MAIL_USER}@${MAIL_DOMAIN}"

# --- mailbox dirs (uid/gid 5000) ---
MAILBOX="/var/mail/vhosts/${MAIL_DOMAIN}/${MAIL_USER}"
mkdir -p "${MAILBOX}"
chown -R 5000:5000 /var/mail/vhosts

# --- dovecot passwd-file: hash gerado a partir de MAIL_PASSWORD (sem segredo no repo) ---
HASH="$(doveadm pw -p "${MAIL_PASSWORD}" -s SHA512-CRYPT)"
printf '%s:%s\n' "${FULL_ADDR}" "${HASH}" > /etc/dovecot/users
chown dovecot:dovecot /etc/dovecot/users
chmod 600 /etc/dovecot/users

# --- postfix maps ---
printf '%s %s/%s/\n' "${FULL_ADDR}" "${MAIL_DOMAIN}" "${MAIL_USER}" > /etc/postfix/vmailbox
printf '@%s %s\n' "${MAIL_DOMAIN}" "${FULL_ADDR}" > /etc/postfix/virtual
postmap /etc/postfix/vmailbox /etc/postfix/virtual

# --- aliases (lmdb) ---
printf 'root: postmaster\n' > /etc/aliases
newaliases

# --- logs ---
mkdir -p /var/log/postfix
touch /var/log/postfix/mail.log /var/log/dovecot.log
chown postfix:postfix /var/log/postfix/mail.log
chown dovecot:dovecot /var/log/dovecot.log

# --- services ---
dovecot -F &
DOVECOT_PID=$!
postfix start

# stream logs + keep container alive
tail -F /var/log/postfix/mail.log /var/log/dovecot.log 2>/dev/null &
wait ${DOVECOT_PID}
