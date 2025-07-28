#!/bin/bash

# Set environment variables
export OPTIDEVDOC_VERSION=2.1.14
export OPTIDEVDOC_MODE=enhanced
export OPTIDEVDOC_MULTI_PRODUCT=true
export OPTIDEVDOC_ENHANCED=true
export OPTIDEVDOC_DEBUG=false
export ENABLE_PRODUCT_DETECTION=true
export ENABLE_ENHANCED_RULES=true
export ENABLE_CORS=false
export PROTOCOL_VERSION=2025-07-27

# Print environment variables for debugging
echo "Environment variables:"
env | grep -E "OPTIDEVDOC_|ENABLE_"

# Start the server
node main.js 