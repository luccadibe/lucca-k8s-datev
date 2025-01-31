https://github.com/rancher/local-path-provisioner

https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.30/deploy/local-path-storage.yaml

I added

```
annotations:
    storageclass.kubernetes.io/is-default-class: "true"
```

to make it the default