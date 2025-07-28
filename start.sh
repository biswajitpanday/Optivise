#!/bin/bash

# Print environment variables for debugging
echo "Environment variables before:"
env | grep -E "OPTIDEVDOC_|ENABLE_"

# Set environment variables if not already set
[ -z "$OPTIDEVDOC_VERSION" ] && export OPTIDEVDOC_VERSION=2.1.14
[ -z "$OPTIDEVDOC_MODE" ] && export OPTIDEVDOC_MODE=enhanced
[ -z "$OPTIDEVDOC_MULTI_PRODUCT" ] && export OPTIDEVDOC_MULTI_PRODUCT=true
[ -z "$OPTIDEVDOC_ENHANCED" ] && export OPTIDEVDOC_ENHANCED=true
[ -z "$OPTIDEVDOC_DEBUG" ] && export OPTIDEVDOC_DEBUG=false
[ -z "$ENABLE_PRODUCT_DETECTION" ] && export ENABLE_PRODUCT_DETECTION=true
[ -z "$ENABLE_ENHANCED_RULES" ] && export ENABLE_ENHANCED_RULES=true
[ -z "$ENABLE_CORS" ] && export ENABLE_CORS=false
[ -z "$PROTOCOL_VERSION" ] && export PROTOCOL_VERSION=2025-07-27

# Print environment variables for debugging
echo "Environment variables after:"
env | grep -E "OPTIDEVDOC_|ENABLE_"

# Start the server
node main.js 