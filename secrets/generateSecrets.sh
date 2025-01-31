#!/bin/bash

echo "Generating secrets..."

# MongoDB secret
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
type: Opaque
data:
  # 'admin' in base64
  username: $(echo -n "admin" | base64)
  # 'secretpassword' in base64
  password: $(echo -n "secretpassword" | base64)
EOF

# TODO add other secrets
