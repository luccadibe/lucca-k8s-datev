# MongoDB Database Access Guide

## Accessing the MongoDB Container

To access the MongoDB container shell:
```bash
kubectl exec -it $(kubectl get pod -l app=mongodb -o jsonpath='{.items[0].metadata.name}') -- bash
```

To get the mongo shell:
```bash
mongo --username admin --password secretpassword --authenticationDatabase admin
```

Then select the database:
```bash
use banksdb
```

Verify the data is there:

```bash
db.bics.find()
```
