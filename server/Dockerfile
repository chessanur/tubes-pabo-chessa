FROM node:12

WORKDIR /app

COPY package*.json /app/

COPY . /app/

RUN npm install

EXPOSE 3001

CMD ["node", "index.js"]