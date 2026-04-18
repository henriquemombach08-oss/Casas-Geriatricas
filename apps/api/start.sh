#!/bin/sh
set -e
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
exec node apps/api/dist/index.js
