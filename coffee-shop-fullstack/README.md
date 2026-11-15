# Brew & Bean — Full-Stack Coffee Shop

A small full-stack ordering and billing app:
- React + Vite frontend served by Nginx
- FastAPI backend
- MySQL 8 database
- Docker, Docker Hub, Docker Compose and Kubernetes manifests

The app supports viewing coffee products, adding a product, creating an order, calculating 5% tax on the server, and viewing recent orders.

## 0. Prerequisites

Install:
- Docker Engine and Docker Compose plugin
- Git (optional)
- A Docker Hub account
- A Kubernetes cluster for the final section (Kind, Minikube, kubeadm or a cloud cluster)

The commands below assume Ubuntu/Linux and that Docker works for your user. On Windows, run the equivalent commands in WSL or PowerShell with path adjustments.

## 1. Extract and enter the project

```bash
unzip coffee-shop-fullstack.zip
cd coffee-shop-fullstack
```

## 2. Build the backend image

Run from the project root:

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/coffee-shop-backend:v1 ./backend
```

## 3. Build the frontend image

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/coffee-shop-frontend:v1 ./frontend
```

Check both images:

```bash
docker images | grep coffee-shop
```

## 4. Log in and push both images to Docker Hub

Replace `YOUR_DOCKERHUB_USERNAME` with your actual Docker Hub username:

```bash
docker login
docker push YOUR_DOCKERHUB_USERNAME/coffee-shop-backend:v1
docker push YOUR_DOCKERHUB_USERNAME/coffee-shop-frontend:v1
```

Verify the two repositories and `v1` tags in Docker Hub.

## 5. Configure Docker Compose to pull from Docker Hub

Create your runtime `.env` file:

```bash
cp .env.example .env
nano .env
```

Set `DOCKERHUB_USERNAME` to your real Docker Hub username. Keep `IMAGE_TAG=v1` to match the tags pushed above. The remaining credentials are demo-only; change them for a real deployment.

Start the stack:

```bash
docker compose pull
docker compose up -d
```

Check status and logs:

```bash
docker compose ps
docker compose logs -f backend
```

Open the app:

```text
http://YOUR_EC2_PUBLIC_IP:8080
```

For EC2, allow inbound TCP port **8080** from your trusted IP in the Security Group. Do not expose MySQL port 3306 publicly.

Test the API through the frontend's Nginx proxy:

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/products
```

OpenAPI docs are available inside the Compose network at `http://backend:8000/docs`; to view them from your host, temporarily publish backend port 8000 in `docker-compose.yml` (ports: `- "8000:8000"`) and then open `http://localhost:8000/docs`.

## 6. Check MySQL data

```bash
docker exec -it coffee-mysql mysql -ucoffee_user -p
```

Enter the `MYSQL_PASSWORD` value from `.env`, then run:

```sql
USE coffeeshop;
SHOW TABLES;
SELECT * FROM products;
SELECT * FROM orders;
SELECT * FROM order_items;
```

The backend creates the tables and inserts sample coffees automatically when it starts for the first time.

## 7. Kubernetes deployment

### Important

Run these commands against your Kubernetes cluster. Make sure `kubectl get nodes` shows Ready nodes and that your cluster has a default StorageClass for the MySQL PVC.

First, edit the two image names in the manifests:

```bash
sed -i 's/YOUR_DOCKERHUB_USERNAME/your-real-dockerhub-username/g' k8s/03-backend.yaml k8s/04-frontend.yaml
```

Apply namespace, database secret, and MySQL first:

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secret.yaml
kubectl apply -f k8s/02-mysql.yaml
```

Wait for MySQL:

```bash
kubectl rollout status deployment/mysql -n coffee-shop --timeout=180s
kubectl get pods,pvc,svc -n coffee-shop
```

Deploy backend and frontend:

```bash
kubectl apply -f k8s/03-backend.yaml
kubectl apply -f k8s/04-frontend.yaml
```

Wait and inspect:

```bash
kubectl rollout status deployment/backend -n coffee-shop --timeout=180s
kubectl rollout status deployment/frontend -n coffee-shop --timeout=180s
kubectl get all -n coffee-shop
```

### Access the Kubernetes frontend

For a simple cluster-independent test, use port-forward:

```bash
kubectl port-forward -n coffee-shop svc/frontend 8080:80 --address 0.0.0.0
```

Then open:

```text
http://YOUR_EC2_PUBLIC_IP:8080
```

If using EC2, allow TCP 8080 in the Security Group from your trusted IP. Stop port-forward with `Ctrl+C`.

For a real external deployment, use an Ingress controller or a LoadBalancer service instead of relying on port-forward. NodePort is also possible, but the example uses port-forward for a straightforward first test.

## 8. Troubleshooting commands

```bash
kubectl get pods -n coffee-shop
kubectl describe pod POD_NAME -n coffee-shop
kubectl logs deployment/backend -n coffee-shop
kubectl logs deployment/mysql -n coffee-shop
kubectl get events -n coffee-shop --sort-by=.metadata.creationTimestamp
```

Common causes:
- `ImagePullBackOff`: check Docker Hub image name, tag, and repository visibility.
- MySQL PVC `Pending`: configure a default StorageClass or create a suitable PersistentVolume.
- Backend restarting: inspect backend logs and verify MySQL pod is Ready and credentials match.
- Frontend loads but API fails: ensure the backend Service is named `backend` and port 8000 is correct.

## 9. Stop and clean up

Compose:

```bash
docker compose down
```

This keeps the named MySQL volume. To delete the database data too (destructive):

```bash
docker compose down -v
```

Kubernetes:

```bash
kubectl delete namespace coffee-shop
```

Deleting the namespace also deletes its PVC and associated claim. Whether the underlying storage is retained depends on the StorageClass reclaim policy.

## Notes

- Sample tax is 5%; change it in `backend/main.py` if your exercise needs another rate.
- Demo passwords in `.env.example` and `k8s/01-secret.yaml` are for local learning only. Use strong secrets and proper secret management in production.
- The database stores money in floating-point columns for simplicity in this training project. Production billing systems should use fixed-precision `DECIMAL` columns.
- The product photos are remote Unsplash images, so the browser needs internet access to display them.
