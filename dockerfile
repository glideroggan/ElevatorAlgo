# Stage 1: Build the application
FROM node:22 AS build

WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the source code
COPY tsconfig.json esbuild.config.js ./
COPY src/ ./src/

# Set environment variable for production build
ENV NODE_ENV=dev
# Build the application
RUN yarn build

# Generate TypeScript declaration files explicitly
# RUN npx tsc --declaration --emitDeclarationOnly --outDir dist/algorithms src/algorithms/BaseElevatorAlgorithm.ts src/algorithms/IElevatorAlgorithm.ts

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built files to Nginx's serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Special handling for TypeScript definition files - ensure correct MIME type
RUN echo 'server { \
    listen 3001; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    # Set correct MIME type for TypeScript and definition files \
    location ~ \\.ts$ { \
        add_header Content-Type "application/typescript"; \
    } \
    location ~ \\.d\\.ts$ { \
        add_header Content-Type "application/typescript"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
