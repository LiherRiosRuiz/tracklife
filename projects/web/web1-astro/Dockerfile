FROM node:22-alpine
RUN apk add --no-cache git bash
WORKDIR /app
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 4321
ENTRYPOINT ["/docker-entrypoint.sh"]
