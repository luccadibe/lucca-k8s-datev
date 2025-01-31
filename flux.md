flux diff kustomization flux-system --path=./cluster
flux bootstrap github --owner=$GITHUB_USER --repository=lucca-k8s-datev --branch=main --path=./cluster
