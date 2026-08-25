# The Master Whiteboard: X-Ray Vision of AWS, EKS, and Microservices

This diagram represents the exact physical and logical mapping of your microservices. It demonstrates how AWS networking (VPCs, Subnets, EC2 Nodes) perfectly overlaps with Kubernetes logic (Namespaces, Services, Pods).

## 1. The Ground-Level Architecture Diagram

```mermaid
flowchart TB
    Internet(("Internet Client<br/>api.nexora.com/cart"))

    subgraph AWS["AWS Cloud (Region: eu-west-1)"]
        direction TB
        R53["Route 53 DNS<br/>A-Record: api.nexora.com"]
        
        subgraph VPC["Shared Production VPC (CIDR: 10.10.0.0/16)"]
            direction TB
            
            subgraph Public["Public Subnets (Multi-AZ)"]
                direction LR
                ALB["AWS Application Load Balancer<br/>(Listens on 443, SSL Terminated)"]
                NAT["NAT Gateways<br/>(Egress to Stripe/Visa)"]
            end

            subgraph Private["Private Subnets (Multi-AZ: 10.10.10.0/24 & 10.10.11.0/24)"]
                direction TB
                
                subgraph EKS["Amazon EKS Cluster (Control Plane managed by AWS)"]
                    direction TB
                    
                    subgraph NG_Sys["EC2 Node Group: 'System-Nodes' (m5.large)"]
                        direction LR
                        subgraph NS_Sys["Namespace: ingress-system"]
                            IngressCtrl["K8s Pods: AWS Load Balancer Controller"]
                        end
                        subgraph NS_Kube["Namespace: kube-system"]
                            CoreDNS["K8s Pods: CoreDNS (Internal Service Discovery)"]
                        end
                    end

                    subgraph NG_Comm["EC2 Node Group: 'Commerce-Nodes' (c6g.2xlarge - Graviton)"]
                        direction TB
                        subgraph NS_Comm["Namespace: commerce-prod (Your Team)"]
                            direction TB
                            
                            subgraph Svc_Cart["K8s Service: cart-service (ClusterIP)"]
                                direction LR
                                Pod_Cart1("K8s Pod: cart-5x7q (Python)")
                                Pod_Cart2("K8s Pod: cart-9y2p (Python)")
                            end
                            
                            subgraph Svc_Pay["K8s Service: payment-service (ClusterIP)"]
                                direction LR
                                Pod_Pay1("K8s Pod: pay-1a2b (Go Binary)")
                                Pod_Pay2("K8s Pod: pay-3c4d (Go Binary)")
                            end
                            
                            subgraph Other_Comm["Other Commerce Services"]
                                direction LR
                                Svc_Auth["auth-service<br/>(4 Pods)"]
                                Svc_Cat["catalog-service<br/>(4 Pods)"]
                                Svc_Notif["notif-disp<br/>(2 Pods)"]
                            end
                        end
                    end

                    subgraph NG_Gen["EC2 Node Group: 'General-Compute' (m6i.4xlarge)"]
                        direction TB
                        subgraph NS_Bill["Namespace: billing-prod"]
                            Svc_Bill["6 K8s Services<br/>~30 Pods running on these EC2s"]
                        end
                        subgraph NS_CRM["Namespace: crm-prod"]
                            Svc_CRM["8 K8s Services<br/>~40 Pods running on these EC2s"]
                        end
                        subgraph NS_OSS["Namespace: telco-oss-prod"]
                            Svc_OSS["11+ K8s Services<br/>~50 Pods running on these EC2s"]
                        end
                    end
                    
                end
            end

            subgraph Isolated["Isolated Subnets (Multi-AZ: 10.10.20.0/24) - NO INTERNET"]
                direction LR
                DB_Comm[(Aurora PostgreSQL<br/>auth_db, catalog_db)]
                Redis_Cart[(ElastiCache Redis<br/>Cart State)]
                DB_Bill[(Aurora PostgreSQL<br/>Billing Data)]
            end
        end
        
        subgraph Serverless["AWS Serverless / API (Outside VPC)"]
            direction LR
            SQS[[SQS FIFO Queue<br/>Payment Events]]
            DDB[(DynamoDB Table<br/>Payment Ledger)]
        end
    end

    %% External routing
    Internet --> R53
    R53 -->|Resolves to| ALB
    ALB -->|Target Group routes to NodePorts| IngressCtrl

    %% Internal Ingress Routing
    IngressCtrl -->|Evaluates path /cart| Svc_Cart
    IngressCtrl -->|Evaluates path /payment| Svc_Pay
    IngressCtrl -->|Evaluates path /billing| Svc_Bill

    %% EKS to Database / Serverless Routing
    Pod_Cart1 -.->|TCP 6379| Redis_Cart
    Pod_Cart2 -.->|TCP 6379| Redis_Cart
    
    Pod_Pay1 -.->|TCP 5432| DB_Comm
    Pod_Pay2 -.->|IAM/HTTPS| DDB
    Pod_Pay1 -.->|IAM/HTTPS| SQS
    
    %% Egress Routing
    Pod_Pay2 -.->|Outbound Bank API| NAT
    
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
    class Private,EKS priv;
    class Isolated iso;
    class NS_Comm,NS_Sys,NS_Kube,NS_Bill,NS_CRM,NS_OSS,Other_Comm k8s;
    class Pod_Cart1,Pod_Cart2,Pod_Pay1,Pod_Pay2 pod;
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
