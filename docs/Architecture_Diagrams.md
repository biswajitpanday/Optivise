# Optivise Architecture Diagrams

This document provides various diagrams to help understand the architecture and functionality of the Optivise tool.

## Architecture Diagram

```mermaid
---
config:
  theme: neo-dark
---
graph TD
    subgraph "Deployment Options"
        NPM[NPM Package]
        Render[Render Cloud Deployment]
    end

    subgraph "Core Components"
        MCP[MCP Server]
        CAE[Context Analysis Engine]
        PDS[Product Detection Service]
        RIS[Rule Intelligence Service]
        DS[Documentation Service]
    end

    subgraph "External Integrations"
        OAI[OpenAI Client]
        CDB[ChromaDB Service]
        DOC[Documentation Sources]
    end

    subgraph "Tools"
        IGT[Implementation Guide Tool]
        DHT[Debug Helper Tool]
        CAT[Code Analyzer Tool]
        PHT[Project Helper Tool]
    end

    NPM --> MCP
    Render --> HTTP[HTTP Server]
    HTTP --> CAE
    
    MCP --> CAE
    MCP --> Tools
    
    CAE --> PDS
    CAE --> RIS
    CAE --> DS
    CAE --> PA[Prompt Analyzer]
    
    PA --> OAI
    DS --> CDB
    DS --> DOC
    
    Tools --> IGT
    Tools --> DHT
    Tools --> CAT
    Tools --> PHT
    
    IGT --> CAE
    DHT --> CAE
    CAT --> CAE
    PHT --> CAE
```

## Data Flow Diagram

```mermaid
---
config:
  theme: neo-dark
---
flowchart TD
    User[User/Developer] -->|Prompt| IDE[IDE/CLI Interface]
    IDE -->|Request| MCP[MCP Server]
    MCP -->|Analyze Context| CAE[Context Analysis Engine]
    
    CAE -->|Analyze Prompt| PA[Prompt Analyzer]
    PA -->|Relevance Score| CAE
    
    CAE -->|Detect Products| PDS[Product Detection Service]
    PDS -->|Product Context| CAE
    
    CAE -->|Analyze Rules| RIS[Rule Intelligence Service]
    RIS -->|Rule Analysis| CAE
    
    CAE -->|Fetch Documentation| DS[Documentation Service]
    DS -->|Vector Search| CDB[ChromaDB Service]
    DS -->|Live Docs| DOC[Documentation Sources]
    CDB & DOC -->|Documentation Content| DS
    DS -->|Curated Documentation| CAE
    
    CAE -->|Curated Context| MCP
    MCP -->|Response| IDE
    IDE -->|Enhanced Response| User
```

## How It Works

```mermaid
---
config:
  theme: neo-dark
---
sequenceDiagram
    participant User as Developer
    participant IDE as IDE/CLI
    participant MCP as MCP Server
    participant CAE as Context Analysis Engine
    participant PA as Prompt Analyzer
    participant PDS as Product Detection
    participant DS as Documentation Service
    
    User->>IDE: Ask Optimizely question
    IDE->>MCP: Send prompt
    MCP->>CAE: Request context analysis
    
    CAE->>PA: Analyze prompt relevance
    PA-->>CAE: Relevance score & intent
    
    alt Relevance > Threshold
        CAE->>PDS: Detect product context
        PDS-->>CAE: Product detection results
        
        CAE->>DS: Fetch relevant documentation
        DS-->>CAE: Curated documentation
        
        CAE->>CAE: Curate context
        CAE-->>MCP: Return curated context
    else Relevance < Threshold
        CAE-->>MCP: Return low relevance response
    end
    
    MCP-->>IDE: Return enhanced response
    IDE-->>User: Display AI response with context
```

## Component Connection Diagram

```mermaid
---
config:
  theme: neo-dark
---
graph TD
    subgraph "Entry Points"
        CLI[CLI Entry Point]
        HTTP[HTTP Server]
    end
    
    subgraph "Core Server"
        MCP[OptiviseMCPServer]
        MCP --> |initialize| CAE[ContextAnalysisEngine]
        MCP --> |initialize| Tools[Specialized Tools]
        MCP --> |initialize| AI[AI Services]
    end
    
    subgraph "Analysis Components"
        CAE --> PA[PromptAnalyzer]
        CAE --> PDS[ProductDetectionService]
        CAE --> RIS[RuleIntelligenceService]
        CAE --> DS[DocumentationService]
    end
    
    subgraph "AI Services"
        OAI[OpenAI Client]
        CDB[ChromaDB Service]
    end
    
    subgraph "Tools"
        Tools --> IGT[ImplementationGuideTool]
        Tools --> DHT[DebugHelperTool]
        Tools --> CAT[CodeAnalyzerTool]
        Tools --> PHT[ProjectHelperTool]
    end
    
    CLI --> MCP
    HTTP --> CAE
    
    CAE --> OAI
    CAE --> CDB
    DS --> CDB
    DS --> DOC[Documentation Sources]
    
    IGT & DHT & CAT & PHT --> CAE
```

## Deployment Model

```mermaid
---
config:
  theme: neo-dark
---
flowchart LR
    subgraph "Local Development"
        IDE[IDE/Editor]
        NPM[NPM Package]
        IDE <--> NPM
    end
    
    subgraph "Cloud Deployment"
        Render[Render Service]
        API[HTTP API]
        Render --> API
    end
    
    subgraph "Shared Components"
        CAE[Context Analysis Engine]
        PDS[Product Detection]
        DS[Documentation Service]
    end
    
    NPM --> CAE
    API --> CAE
    CAE --> PDS
    CAE --> DS
    
    subgraph "External Services"
        OAI[OpenAI API]
        CDB[ChromaDB]
        DOC[Documentation Sources]
    end
    
    CAE --> OAI
    DS --> CDB
    DS --> DOC
```

## Data Processing Pipeline

```mermaid
---
config:
  theme: neo-dark
---
graph TD
    Input[User Prompt] --> PA[Prompt Analysis]
    PA --> |Relevance Score| Relevance{Relevance > 0.7?}
    
    Relevance -->|Yes| PD[Product Detection]
    Relevance -->|No| LR[Low Relevance Response]
    
    PD --> DF[Documentation Fetching]
    DF --> |AI Available?| AI{AI Enabled?}
    
    AI -->|Yes| VS[Vector Search]
    AI -->|No| BD[Basic Documentation]
    
    VS & BD --> CC[Context Curation]
    CC --> Response[Curated Response]
    LR --> Response
```