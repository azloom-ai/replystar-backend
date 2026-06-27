FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
RUN echo "build-v3"
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/index.js"]
