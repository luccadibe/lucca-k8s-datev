# for running the workload-generator
```bash
kubectl run workload-generator \
  --image=europe-west10-docker.pkg.dev/schirmer-project/swc/workload-generator:latest \
  --env=ENDPOINT="invoice-queue.default.svc.cluster.local:5672" \
  --env=RABBITMQ_USER="default_user_DIvgQNR1vnhX9smMrkS" \
  --env=RABBITMQ_PASS="a7s7pp7j5V3oTBMw33k8vbdbDK8xGrwg" \
  --env=INVOICES_PER_SECOND="5" \
  --env=MID_ITEMS_PER_INVOICE="10" \
  --env=MIN_ITEMS_PER_INVOICE="3" \
  --env=MAX_ITEMS_PER_INVOICE="20" \
  --env=GENERATE_LARGE_INVOICE="false" \
  --env=ITEMS_LARGE_INVOICE="100000" \
  --env=DURATION="1000" \
  --restart=Never \
  --command -- k6 run /script.js

```

# after running:

```bash
kubectl delete pod workload-generator

```
# Env_variables: 
MID_ITEMS_PER_INVOICE: 30 percent of invoices will be sent with this amount of items
MIN_ITEMS_PER_INVOICE: 30 percent of invoices will be sent with this amount of items
MAX_ITEMS_PER_INVOICE: 30 percent of invoices will be sent with this amount of items
GENERATE_LARGE_INVOICE: whether one big invoice (100000 items) should be generated
ITEMS_LARGE_INVOICE: how many items in large invoice
DURATION: duration of test in ms, has to be at least 1000ms 