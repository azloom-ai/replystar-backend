FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
RUN echo "build-v4"
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/index.js"]
