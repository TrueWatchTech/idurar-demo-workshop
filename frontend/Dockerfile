FROM node:20.9.0-alpine

WORKDIR /usr/src/app

RUN npm install -g npm@10.2.4

COPY package*.json ./
COPY vite.config.js ./

COPY . .

RUN npm install

EXPOSE 3000

ENV NODE_ENV=development
ENV REACT_APP_API_URL=https://x.x.x/api/
ENV NODE_OPTIONS=--openssl-legacy-provider

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]