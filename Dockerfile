# Create container with node and npm preinstalled
FROM 964817954891.dkr.ecr.us-east-1.amazonaws.com/node:14-alpine

# Install app dependencies
COPY package*.json /tmp/
RUN npm install --only=production --prefix /tmp
RUN mkdir -p /app && mv /tmp/node_modules /app/

# Create app directory
WORKDIR /app
COPY . /app/

# Bind to port 80
EXPOSE 80

CMD node index.js
