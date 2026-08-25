# The Master Whiteboard: X-Ray Vision of AWS, EKS, and Microservices

This diagram represents the exact physical and logical mapping of your microservices. It demonstrates how AWS networking (VPCs, Subnets, EC2 Nodes) perfectly overlaps with Kubernetes logic (Namespaces, Services, Pods).

## 1. The Ground-Level Architecture Diagram

```mermaid
flowchart LR
    Internet(("Internet Client")) --> R53["Route 53 DNS"]
    
    subgraph AWS["AWS Cloud (Region: eu-west-1)"]
        
        subgraph VPC["Shared Production VPC (10.10.0.0/16)"]
            
            subgraph Public["Public Subnets (Edge)"]
                direction TB
                ALB["AWS ALB (SSL Terminated)"]
                NAT["NAT Gateways (Egress)"]
            end
            
            subgraph Private["Private Subnets (EKS Cluster Nodes)"]
                direction TB
                
                subgraph SysNG["System Node Group"]
                    IngressCtrl["ingress-system<br/>(AWS ALB Controller)"]
                end
                
                subgraph CommNG["Commerce Node Group (Graviton)"]
                    direction TB
                    Cart["cart-service<br/>(Python Pods)"]
                    Pay["payment-service<br/>(Go Pods)"]
                    Rest["auth, catalog, notif<br/>(8 Pods)"]
                end
                
                subgraph GenNG["General Compute Node Group (Intel)"]
                    direction TB
                    Bill["billing-prod<br/>(30 Pods)"]
                    CRM["crm-prod & telco-oss<br/>(90 Pods)"]
                end
            end
            
            subgraph Isolated["Isolated Subnets (Data)"]
                direction TB
                DB_Comm[(Aurora PostgreSQL<br/>Commerce DBs)]
                Redis[(ElastiCache Redis<br/>Cart State)]
            end
        end
        
        subgraph Serverless["AWS Serverless (Outside VPC)"]
            direction TB
            DDB[(DynamoDB Table)]
            SQS[[SQS FIFO Queue]]
        end
    end

    %% Routing
    R53 --> ALB
    ALB -->|Target Group| IngressCtrl
    IngressCtrl -->|/cart| Cart
    IngressCtrl -->|/payment| Pay
    IngressCtrl -->|/billing| Bill
    
    %% DB
    Cart -.->|TCP 6379| Redis
    Pay -.->|TCP 5432| DB_Comm
    
    %% Serverless & Egress
    Pay -.->|HTTPS| DDB
    Pay -.->|HTTPS| SQS
    Pay -.->|Outbound Bank API| NAT
    
    %% Styling
    classDef aws fill:#ff9900,stroke:#232f3e,stroke-width:2px,color:#232f3e,font-weight:bold;
    classDef vpc fill:#0369a1,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef pub fill:#bae6fd,stroke:#0284c7,stroke-width:1px,color:#0f172a;
    classDef priv fill:#1e293b,stroke:#34d399,stroke-width:2px,color:#fff;
    classDef iso fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff;
    classDef k8s fill:#326ce5,stroke:#fff,stroke-width:1px,color:#fff;
    classDef pod fill:#0ea5e9,stroke:#fff,stroke-width:1px,color:#fff;
    
    class AWS aws;
    class VPC vpc;
    class Public pub;
    class Private priv;
    class Isolated iso;
    class SysNG,CommNG,GenNG k8s;
    class Cart,Pay,Rest,Bill,CRM,IngressCtrl pod;
```

---

## 2. Step-by-Step Interview Narrative

When asked to trace a request, walk through these 5 layers:

### 1. DNS & Subdomain Routing (The Outer Edge)
*"The user navigates to `api.nexora.com/cart`. **Route 53** holds the A-Record for the `api` subdomain, which points to the **AWS Application Load Balancer (ALB)** living in our Public Subnets."*

### 2. The VPC & Kubernetes Bridge (Ingress)
*"The ALB terminates SSL and forwards the traffic into our Private Subnets, hitting the EC2 instances (EKS Worker Nodes). Specifically, it hits the NodePorts opened by the **AWS Load Balancer Controller** pods running in the `ingress-system` namespace. The Ingress controller looks at the URL path (`/cart`) and uses Kubernetes internal rules to route traffic to the **Kubernetes Service** named `cart-service`."*

### 3. Kubernetes Logical Abstraction (Namespaces & Services)
*"Inside the cluster, we use **Namespaces** to logically separate the 30 microservices. The 5 Commerce services live in `commerce-prod`, while the 6 Billing services live in `billing-prod`. The `cart-service` acts as an internal load balancer (ClusterIP). It uses iptables/kube-proxy to round-robin the traffic to the actual healthy **Pods** (e.g., `cart-pod-1` or `cart-pod-2`)."*

### 4. Kubernetes Physical Layer (Node Groups & Pods)
*"Namespaces are just logical, but we also enforce **physical node isolation** using EKS Node Groups with Taints and Tolerations. The `kube-system` pods run on dedicated system EC2 nodes. The 25 billing/CRM/OSS services run on a massive pool of General Compute EC2 nodes. Our 5 Commerce services run on a dedicated Node Group of Graviton EC2 instances. So when traffic hits `cart-pod-1`, that container is physically executing on a specific Commerce EC2 instance inside the Private Subnet."*

### 5. Connecting to the Dependents (Databases & AWS Services)
*"Once the code inside `cart-pod-1` executes, it needs to save the user's shopping cart. Because the pod is sitting in a Private Subnet, it can route traffic down into our **Isolated Subnets** to talk to the **ElastiCache Redis** cluster on port 6379. If this was the Payment Pod, it might need to write to **DynamoDB** or **SQS**. Because those are serverless, the pod's traffic leaves the EC2 instance, traverses the AWS backbone via VPC Endpoints, and authenticates to DynamoDB securely using its IRSA (IAM Role for Service Account) token."*
