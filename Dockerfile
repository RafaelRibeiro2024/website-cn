FROM node:latest

WORKDIR /

COPY package*.json ./

# dependencies
RUN npm install
RUN npm install express
RUN npm install express-fileupload
RUN npm install body-parser
RUN npm install @azure/cosmos
RUN npm install @azure/storage-blob

COPY . .

EXPOSE 3000

CMD [ "node", "index.js" ]