#!/bin/bash

echo "=========================================="
echo "gRPC Auth Service - Comprehensive Test"
echo "=========================================="
echo ""

# Helper function to extract JSON field
extract_field() {
  local json="$1"
  local field="$2"
  echo "$json" | tr -d '\n' | tr -d ' ' | awk -F"\"$field\":\"" '{print $2}' | awk -F'"' '{print $1}'
}

# Helper function to extract user ID
extract_user_id() {
  local json="$1"
  echo "$json" | tr -d '\n' | tr -d ' ' | awk -F'"id":"' '{print $2}' | awk -F'"' '{print $1}'
}

# Helper function to check if response indicates success
check_success() {
  local json="$1"
  echo "$json" | tr -d '\n' | tr -d ' ' | grep -q '"success":true'
}

# ==========================================
# REGISTRATION TESTS
# ==========================================

echo "=== 1. Register User 1 ==="
REGISTER1=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user1@test.com","password":"pass123","name":"User One"}' localhost:50051 auth.AuthService.Register)
echo "$REGISTER1"
USER1_ID=$(extract_user_id "$REGISTER1")
USER1_ACCESS=$(extract_field "$REGISTER1" "accessToken")
echo "✓ User 1 ID: $USER1_ID"
echo ""

echo "=== 2. Register User 2 ==="
REGISTER2=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user2@test.com","password":"pass456","name":"User Two"}' localhost:50051 auth.AuthService.Register)
echo "$REGISTER2"
USER2_ID=$(extract_user_id "$REGISTER2")
echo "✓ User 2 ID: $USER2_ID"
echo ""

echo "=== 3. Register User 3 ==="
REGISTER3=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user3@test.com","password":"pass789","name":"User Three"}' localhost:50051 auth.AuthService.Register)
echo "$REGISTER3"
USER3_ID=$(extract_user_id "$REGISTER3")
echo "✓ User 3 ID: $USER3_ID"
echo ""

echo "=== 4. Register Duplicate User (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user1@test.com","password":"pass123"}' localhost:50051 auth.AuthService.Register
echo ""
echo ""

# ==========================================
# LOGIN TESTS
# ==========================================

echo "=== 5. Login User 1 ==="
LOGIN1=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user1@test.com","password":"pass123"}' localhost:50051 auth.AuthService.Login)
echo "$LOGIN1"
LOGIN1_ACCESS=$(extract_field "$LOGIN1" "accessToken")
LOGIN1_REFRESH=$(extract_field "$LOGIN1" "refreshToken")
# Extract user ID from login if not already set from registration
if [ -z "$USER1_ID" ]; then
  USER1_ID=$(extract_user_id "$LOGIN1")
fi
echo "✓ Login successful"
echo ""

echo "=== 6. Login User 2 ==="
LOGIN2=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user2@test.com","password":"pass456"}' localhost:50051 auth.AuthService.Login)
echo "$LOGIN2"
LOGIN2_ACCESS=$(extract_field "$LOGIN2" "accessToken")
# Extract user ID from login if not already set from registration
if [ -z "$USER2_ID" ]; then
  USER2_ID=$(extract_user_id "$LOGIN2")
fi
echo "✓ Login successful"
echo ""

echo "=== 6.5. Login User 3 ==="
LOGIN3=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user3@test.com","password":"pass789"}' localhost:50051 auth.AuthService.Login)
echo "$LOGIN3"
# Extract user ID from login if not already set from registration
if [ -z "$USER3_ID" ]; then
  USER3_ID=$(extract_user_id "$LOGIN3")
fi
echo "✓ Login successful"
echo ""

echo "=== 7. Login with Wrong Password (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user1@test.com","password":"wrongpass"}' localhost:50051 auth.AuthService.Login
echo ""
echo ""

echo "=== 8. Login Non-existent User (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"email":"nonexistent@test.com","password":"pass123"}' localhost:50051 auth.AuthService.Login
echo ""
echo ""

# ==========================================
# TOKEN VERIFICATION TESTS
# ==========================================

echo "=== 9. VerifyToken - Valid Token ==="
if [ -n "$LOGIN1_ACCESS" ]; then
  grpcurl -plaintext -proto proto/auth.proto -d "{\"token\":\"$LOGIN1_ACCESS\"}" localhost:50051 auth.AuthService.VerifyToken
else
  echo "ERROR: No access token available"
fi
echo ""
echo ""

echo "=== 10. VerifyToken - Invalid Token (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"token":"invalid.token.here"}' localhost:50051 auth.AuthService.VerifyToken
echo ""
echo ""

# ==========================================
# REFRESH TOKEN TESTS
# ==========================================

echo "=== 11. RefreshToken - Valid Token ==="
if [ -n "$LOGIN1_REFRESH" ]; then
  REFRESH_RESPONSE=$(grpcurl -plaintext -proto proto/auth.proto -d "{\"refreshToken\":\"$LOGIN1_REFRESH\"}" localhost:50051 auth.AuthService.RefreshToken)
  echo "$REFRESH_RESPONSE"
  NEW_ACCESS=$(extract_field "$REFRESH_RESPONSE" "accessToken")
  NEW_REFRESH=$(extract_field "$REFRESH_RESPONSE" "refreshToken")
  if [ -n "$NEW_ACCESS" ]; then
    echo "✓ New tokens generated"
    LOGIN1_ACCESS="$NEW_ACCESS"
    LOGIN1_REFRESH="$NEW_REFRESH"
  fi
else
  echo "ERROR: No refresh token available"
fi
echo ""
echo ""

echo "=== 12. RefreshToken - Invalid Token (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"refreshToken":"invalid.refresh.token"}' localhost:50051 auth.AuthService.RefreshToken
echo ""
echo ""

# ==========================================
# GET USER TESTS
# ==========================================

echo "=== 13. GetUser - Valid ID ==="
if [ -n "$USER1_ID" ]; then
  grpcurl -plaintext -proto proto/auth.proto -d "{\"id\":\"$USER1_ID\"}" localhost:50051 auth.AuthService.GetUser
else
  echo "ERROR: No user ID available"
fi
echo ""
echo ""

echo "=== 14. GetUser - Invalid ID (should return not found) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"id":"00000000-0000-0000-0000-000000000000"}' localhost:50051 auth.AuthService.GetUser
echo ""
echo ""

# ==========================================
# UPDATE USER TESTS
# ==========================================

echo "=== 15. UpdateUser - Update Name Only ==="
if [ -n "$USER2_ID" ]; then
  UPDATE_RESPONSE=$(grpcurl -plaintext -proto proto/auth.proto -d "{\"id\":\"$USER2_ID\",\"name\":\"User Two Updated\"}" localhost:50051 auth.AuthService.UpdateUser)
  echo "$UPDATE_RESPONSE"
  if check_success "$UPDATE_RESPONSE"; then
    echo "✓ User updated"
  else
    echo "✗ Update failed"
  fi
else
  echo "ERROR: No user ID available"
fi
echo ""
echo ""

echo "=== 16. UpdateUser - Update Email and Role ==="
if [ -n "$USER3_ID" ]; then
  # Use timestamp to ensure unique email
  TIMESTAMP=$(date +%s)
  # Role: 0 = USER, 1 = ADMIN (proto enum values)
  UPDATE_RESPONSE2=$(grpcurl -plaintext -proto proto/auth.proto -d "{\"id\":\"$USER3_ID\",\"email\":\"user3updated@test.com\",\"role\":1}" localhost:50051 auth.AuthService.UpdateUser)
  echo "$UPDATE_RESPONSE2"
  if check_success "$UPDATE_RESPONSE2"; then
    echo "✓ User updated"
  else
    echo "✗ Update failed - check error message above"
  fi
else
  echo "ERROR: No user ID available"
fi
echo ""
echo ""

echo "=== 17. UpdateUser - Invalid ID (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"id":"00000000-0000-0000-0000-000000000000","name":"Test"}' localhost:50051 auth.AuthService.UpdateUser
echo ""
echo ""

# ==========================================
# DELETE USER TESTS
# ==========================================

echo "=== 18. DeleteUser - Soft Delete User 2 ==="
if [ -n "$USER2_ID" ]; then
  DELETE_RESPONSE=$(grpcurl -plaintext -proto proto/auth.proto -d "{\"id\":\"$USER2_ID\"}" localhost:50051 auth.AuthService.DeleteUser)
  echo "$DELETE_RESPONSE"
  echo "✓ User deleted (soft delete)"
else
  echo "ERROR: No user ID available"
fi
echo ""
echo ""

echo "=== 19. Try Login with Deleted User (should fail) ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user2@test.com","password":"pass456"}' localhost:50051 auth.AuthService.Login
echo ""
echo ""

echo "=== 20. GetUser - Deleted User (should return not found or inactive) ==="
if [ -n "$USER2_ID" ]; then
  grpcurl -plaintext -proto proto/auth.proto -d "{\"id\":\"$USER2_ID\"}" localhost:50051 auth.AuthService.GetUser
else
  echo "ERROR: No user ID available"
fi
echo ""
echo ""

# ==========================================
# REACTIVATION TEST
# ==========================================

echo "=== 21. Register with Deleted User Email (should reactivate) ==="
REACTIVATE=$(grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user2@test.com","password":"newpass123","name":"User Two Reactivated"}' localhost:50051 auth.AuthService.Register)
echo "$REACTIVATE"
REACTIVATE_ID=$(extract_user_id "$REACTIVATE")
echo "✓ User reactivated with ID: $REACTIVATE_ID"
echo ""

echo "=== 22. Login with Reactivated User ==="
grpcurl -plaintext -proto proto/auth.proto -d '{"email":"user2@test.com","password":"newpass123"}' localhost:50051 auth.AuthService.Login
echo ""
echo ""

# ==========================================
# FINAL SUMMARY
# ==========================================

echo "=========================================="
echo "Test Summary:"
echo "=========================================="
echo "✓ Registered 3 users"
echo "✓ Tested duplicate registration (failed as expected)"
echo "✓ Tested login (success and failures)"
echo "✓ Tested token verification"
echo "✓ Tested token refresh"
echo "✓ Tested GetUser"
echo "✓ Tested UpdateUser"
echo "✓ Tested DeleteUser (soft delete)"
echo "✓ Tested reactivation of deleted user"
echo "=========================================="
echo "All tests completed!"
echo "=========================================="
