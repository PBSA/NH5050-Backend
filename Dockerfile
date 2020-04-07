FROM node:12

WORKDIR /nh5050

ARG node_env=''
ENV NODE_ENV=$node_env

COPY ./package*.json /nh5050/

RUN npm install --silent

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
