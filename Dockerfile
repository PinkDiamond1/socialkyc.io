FROM node:18.12.1-alpine AS base

WORKDIR /app

FROM base AS builder

# one of dependencies uses node-gyp which requires build tools
RUN apk add --update --no-cache python3 g++ make && ln -sf python3 /usr/bin/python

# install build dependencies
# @parcel/css-linux-x64-musl is not optional but marked so
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-optional && yarn add --ignore-optional --dev @parcel/css-linux-x64-musl && yarn cache clean --all

# get the sources and build the app
COPY src ./src
COPY tsconfig.json ./
RUN yarn build

FROM base AS release

# add nginx and its configuration
RUN apk add --update --no-cache nginx nginx-mod-http-brotli
COPY ./nginx.conf /etc/nginx/http.d/default.conf

# tell the app it will run on port 4000 in production mode
ENV PORT 4000
ENV NODE_ENV production

# get the dependencies and sources
COPY package.json yarn.lock ./
# install the production dependencies only (depends on NODE_ENV)
RUN yarn install --frozen-lockfile --ignore-optional && yarn cache clean --all

# FIXME: a workaround for missing import type assertion
COPY scripts/patchVCExport.js .
RUN node /app/patchVCExport.js

# carry over the built code
COPY --from=builder /app/dist dist

EXPOSE 3000
ENTRYPOINT nginx; exec yarn --silent start
