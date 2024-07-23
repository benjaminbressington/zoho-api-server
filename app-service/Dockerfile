FROM node:18

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

RUN npm install pm2 -g

COPY backend ./

CMD ["pm2-runtime", "start", "server.js"]
