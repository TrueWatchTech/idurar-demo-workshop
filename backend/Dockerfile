FROM alpine:latest

# Install build tools and Python
RUN apk update && apk add --no-cache build-base python3 && apk add --no-cache nodejs npm

WORKDIR /usr/src/app

RUN npm install -g npm

COPY package*.json ./

COPY . .

RUN npm install

EXPOSE 8888

# Set environment variables
ENV NODE_ENV=development
ENV DATABASE=mongodb://root:ChangeMe123@mongo:27017/
ENV NODE_OPTIONS=--openssl-legacy-provider
ENV DD_TRACE_AGENT_URL=https://rum.x.x

CMD ["npm", "run", "dev"]