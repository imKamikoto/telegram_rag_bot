FROM node:20-alpine AS builder
WORKDIR /app
COPY admin_webapp/package*.json ./
RUN npm ci
COPY admin_webapp/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
