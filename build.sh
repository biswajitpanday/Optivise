#!/bin/bash

# Install dependencies
yarn install
yarn add dotenv

# Create .env file
cat > .env << EOL
OPTIDEVDOC_VERSION=2.1.14
OPTIDEVDOC_MODE=enhanced
OPTIDEVDOC_MULTI_PRODUCT=true
OPTIDEVDOC_ENHANCED=true
OPTIDEVDOC_DEBUG=false
ENABLE_PRODUCT_DETECTION=true
ENABLE_ENHANCED_RULES=true
ENABLE_CORS=false
PROTOCOL_VERSION=2025-07-27
EOL

# Make the file executable
chmod +x main.js

echo "Build completed successfully!" 