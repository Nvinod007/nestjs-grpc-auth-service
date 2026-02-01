#!/bin/bash

echo "=========================================="
echo "gRPC Auth Service Test Script"
echo "=========================================="
echo ""

# 1. Register a new user
echo "=== 1. Register a new user ==="
REGISTER_RESPONSE=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"test@example.com","password":"password123","name":"Test User"}' localhost:50051 auth.AuthService.Register)
echo "$REGISTER_RESPONSE"
echo ""

# Extract tokens from response
REGISTER_RESPONSE_SINGLE=$(echo "$REGISTER_RESPONSE" | tr -d '\n' | tr -d ' ')
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE_SINGLE" | awk -F'"accessToken":"' '{print $2}' | awk -F'"' '{print $1}')
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE_SINGLE" | awk -F'"refreshToken":"' '{print $2}' | awk -F'"' '{print $1}')

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✓ Extracted Access Token: ${ACCESS_TOKEN:0:50}..."
else
  echo "✗ Failed to extract access token"
fi

if [ -n "$REFRESH_TOKEN" ]; then
  echo "✓ Extracted Refresh Token: ${REFRESH_TOKEN:0:50}..."
else
  echo "✗ Failed to extract refresh token"
fi
echo ""

# 2. Register duplicate user (should fail)
echo "=== 2. Register duplicate user (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"email":"test@example.com","password":"password123"}' localhost:50051 auth.AuthService.Register
echo ""
echo ""

# 3. Login
echo "=== 3. Login ==="
LOGIN_RESPONSE=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"test@example.com","password":"password123"}' localhost:50051 auth.AuthService.Login)
echo "$LOGIN_RESPONSE"
echo ""

# Extract tokens from login - Use these for testing
# Remove newlines and extract tokens using awk
LOGIN_RESPONSE_SINGLE=$(echo "$LOGIN_RESPONSE" | tr -d '\n' | tr -d ' ')
LOGIN_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE_SINGLE" | awk -F'"accessToken":"' '{print $2}' | awk -F'"' '{print $1}')
LOGIN_REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE_SINGLE" | awk -F'"refreshToken":"' '{print $2}' | awk -F'"' '{print $1}')

# Use Login tokens if Register failed, otherwise prefer Register tokens
if [ -z "$ACCESS_TOKEN" ] && [ -n "$LOGIN_ACCESS_TOKEN" ]; then
  ACCESS_TOKEN="$LOGIN_ACCESS_TOKEN"
  REFRESH_TOKEN="$LOGIN_REFRESH_TOKEN"
  echo "✓ Using tokens from Login (Register failed or user exists)"
fi

if [ -n "$LOGIN_ACCESS_TOKEN" ]; then
  echo "✓ Login Access Token: ${LOGIN_ACCESS_TOKEN:0:50}..."
  echo "✓ Login Refresh Token: ${LOGIN_REFRESH_TOKEN:0:50}..."
fi
echo ""

# 4. Login with wrong password (should fail)
echo "=== 4. Login with wrong password (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"email":"test@example.com","password":"wrongpass"}' localhost:50051 auth.AuthService.Login
echo ""
echo ""

# 5. VerifyToken with valid token
echo "=== 5. VerifyToken with valid access token ==="
if [ -n "$ACCESS_TOKEN" ] || [ -n "$LOGIN_ACCESS_TOKEN" ]; then
  TOKEN_TO_USE="${ACCESS_TOKEN:-$LOGIN_ACCESS_TOKEN}"
  grpcurl -plaintext -proto proto/auth.proto -d "{\"token\":\"$TOKEN_TO_USE\"}" localhost:50051 auth.AuthService.VerifyToken
else
  echo "ERROR: No access token found."
fi
echo ""
echo ""

# 6. VerifyToken with invalid token (should fail)
echo "=== 6. VerifyToken with invalid token (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"token":"invalid.token.here"}' localhost:50051 auth.AuthService.VerifyToken
echo ""
echo ""

# 7. RefreshToken with valid refresh token
echo "=== 7. RefreshToken with valid refresh token ==="
REFRESH_TOKEN_TO_USE="${REFRESH_TOKEN:-$LOGIN_REFRESH_TOKEN}"
if [ -n "$REFRESH_TOKEN_TO_USE" ]; then
  REFRESH_RESPONSE=$(grpcurl -plaintext -proto proto/auth.proto -d "{\"refreshToken\":\"$REFRESH_TOKEN_TO_USE\"}" localhost:50051 auth.AuthService.RefreshToken)
  echo "$REFRESH_RESPONSE"
  
  # Extract new tokens
  REFRESH_RESPONSE_SINGLE=$(echo "$REFRESH_RESPONSE" | tr -d '\n' | tr -d ' ')
  NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE_SINGLE" | awk -F'"accessToken":"' '{print $2}' | awk -F'"' '{print $1}')
  NEW_REFRESH_TOKEN=$(echo "$REFRESH_RESPONSE_SINGLE" | awk -F'"refreshToken":"' '{print $2}' | awk -F'"' '{print $1}')
  echo ""
  if [ -n "$NEW_ACCESS_TOKEN" ]; then
    echo "✓ New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
    echo "✓ New Refresh Token: ${NEW_REFRESH_TOKEN:0:50}..."
  fi
else
  echo "ERROR: No refresh token found."
fi
echo ""
echo ""

# 8. RefreshToken with invalid token (should fail)
echo "=== 8. RefreshToken with invalid token (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"refreshToken":"invalid.token"}' localhost:50051 auth.AuthService.RefreshToken
echo ""
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
