# to send bomb

```bash
kubectl run send-bomb \
  --image=europe-west10-docker.pkg.dev/schirmer-project/swc/send-bomb:latest \
  --env=ENDPOINT="invoice-queue.default.svc.cluster.local:5672" \
  --env=RABBITMQ_USER="default_user_DIvgQNR1vnhX9smMrkS" \
  --env=RABBITMQ_PASS="a7s7pp7j5V3oTBMw33k8vbdbDK8xGrwg" \
  --env=ITEMS_LARGE_INVOICE="100000" \
  --restart=Never \
  --command -- k6 run /script.js

```

# after running
```bash
kubectl delete pod send-bomb
```