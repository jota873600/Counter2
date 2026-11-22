FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# devDependencies são necessárias para o build (typescript, tailwind)
RUN npm install --include=dev
COPY . .
RUN npm run build
ENV PORT=3000 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
CMD ["npm", "start"]
