# Protobuf Keywords Reference Guide

## Essential Keywords (You'll Use Most)

### 1. **syntax** - Version declaration
```protobuf
syntax = "proto3";
```

### 2. **package** - Namespace
```protobuf
package auth;
```

### 3. **service** - gRPC service definition
```protobuf
service AuthService {
  rpc Method(Request) returns (Response);
}
```

### 4. **rpc** - Remote procedure call
```protobuf
rpc Login(LoginRequest) returns (LoginResponse);
```

### 5. **message** - Data structure
```protobuf
message User {
  string id = 1;
}
```

### 6. **optional** - Nullable field
```protobuf
optional string name = 3;
```

### 7. **repeated** - Array/List
```protobuf
repeated string tags = 1;
```

## Data Types

- `string` - Text
- `int32` - 32-bit integer
- `int64` - 64-bit integer (for timestamps)
- `bool` - true/false
- `float` - 32-bit floating point
- `double` - 64-bit floating point
- `bytes` - Binary data

## Advanced Keywords (Learn Later)

### 8. **enum** - Named constants
```protobuf
enum Status {
  PENDING = 0;
  ACTIVE = 1;
}
```

### 9. **oneof** - Mutually exclusive fields
```protobuf
oneof payment {
  string card = 1;
  string paypal = 2;
}
```

### 10. **map** - Key-value pairs
```protobuf
map<string, string> metadata = 1;
```

### 11. **reserved** - Reserved fields
```protobuf
reserved 2, 15;
```

### 12. **import** - Import other proto files
```protobuf
import "common.proto";
```

## Field Numbers Rules

- Must be unique within a message
- 1-15: Use 1 byte (more efficient)
- 16-2047: Use 2 bytes
- Don't reuse deleted field numbers (use `reserved`)

## Common Patterns

### Required fields (validate in code, not proto)
```protobuf
string email = 1;  // Required - validate in NestJS
```

### Optional fields
```protobuf
optional string name = 2;  // Can be null
```

### Arrays
```protobuf
repeated string roles = 3;  // string[]
```

### Nested messages
```protobuf
message User {
  string id = 1;
  Address address = 2;  // Uses Address message
}
```
