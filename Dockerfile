FROM node:20

WORKDIR /app

# Install Playwright system dependencies as root before anything else
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libexpat1 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libfontconfig1 \
    fonts-liberation \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install root dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Install admin dependencies (ignore-scripts so postinstall doesn't run yet)
COPY admin/package*.json ./admin/
RUN npm ci --prefix admin --ignore-scripts

# Now install Playwright chromium (system deps already present above)
RUN cd admin && npx playwright install chromium

# Copy all source
COPY . .

# Build admin Next.js
RUN npm --prefix admin run build

EXPOSE 3000

CMD ["npm", "start"]
