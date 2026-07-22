-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "preferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedFrom" TEXT,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "experience" TEXT NOT NULL DEFAULT '0年',
    "background" TEXT NOT NULL DEFAULT '{}',
    "overallScore" INTEGER NOT NULL DEFAULT 50,
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "weaknesses" TEXT NOT NULL DEFAULT '[]',
    "riskTolerance" TEXT NOT NULL DEFAULT 'medium',
    "investmentStyle" TEXT NOT NULL DEFAULT 'moderate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stage" TEXT NOT NULL DEFAULT 'idea',
    "category" TEXT,
    "target" TEXT,
    "city" TEXT,
    "district" TEXT,
    "budget" DOUBLE PRECISION,
    "profile" TEXT,
    "currentGoal" TEXT,
    "healthScore" INTEGER,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantProfile" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL DEFAULT 'unknown',
    "city" TEXT,
    "storeCount" INTEGER NOT NULL DEFAULT 1,
    "priceRange" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "positioning" TEXT,
    "targetCustomer" TEXT,
    "consumptionScene" TEXT,
    "brandPromise" TEXT,
    "competitiveAdvantage" TEXT,
    "brandRisk" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "monthlyRevenue" DOUBLE PRECISION,
    "grossMargin" DOUBLE PRECISION,
    "netMargin" DOUBLE PRECISION,
    "averageTicket" DOUBLE PRECISION,
    "dailyOrders" INTEGER,
    "laborRatio" DOUBLE PRECISION,
    "rentRatio" DOUBLE PRECISION,
    "businessModel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityProfile" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "strategyScore" INTEGER NOT NULL DEFAULT 0,
    "marketScore" INTEGER NOT NULL DEFAULT 0,
    "productScore" INTEGER NOT NULL DEFAULT 0,
    "financeScore" INTEGER NOT NULL DEFAULT 0,
    "operationScore" INTEGER NOT NULL DEFAULT 0,
    "organizationScore" INTEGER NOT NULL DEFAULT 0,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderProfile" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "experience" TEXT,
    "decisionStyle" TEXT,
    "riskPreference" TEXT,
    "strengthsJson" TEXT,
    "weaknessesJson" TEXT,
    "blindSpotsJson" TEXT,
    "growthTrendJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "mkDecisionId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "question" TEXT NOT NULL,
    "contextJson" TEXT,
    "optionsJson" TEXT,
    "chosenOption" TEXT,
    "aiAssessmentJson" TEXT,
    "councilResultJson" TEXT,
    "expectedOutcomeJson" TEXT,
    "actualOutcomeJson" TEXT,
    "learningGenerated" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionRecord" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "decisionId" TEXT,
    "action" TEXT NOT NULL,
    "owner" TEXT,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainLearning" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "pattern" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionState" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "understandingScore" INTEGER NOT NULL DEFAULT 0,
    "dataCompleteness" INTEGER NOT NULL DEFAULT 0,
    "decisionCount" INTEGER NOT NULL DEFAULT 0,
    "learningCount" INTEGER NOT NULL DEFAULT 0,
    "actionCount" INTEGER NOT NULL DEFAULT 0,
    "lastEvolutionAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvolutionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 50,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryInsight" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'unknown',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "evidenceLevel" TEXT NOT NULL DEFAULT 'validated_outcome',
    "sourceKind" TEXT NOT NULL,
    "anonymizedJson" TEXT NOT NULL,
    "contributorHash" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "supportCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "agentRunId" TEXT,
    "agentId" TEXT,
    "problem" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "judgement" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "outcome" TEXT,
    "learning" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionEvent" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" TEXT,
    "sourceEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveSession" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT,
    "projectId" TEXT,
    "decisionId" TEXT,
    "contextSnapshotRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "confidenceRef" TEXT,
    "source" TEXT NOT NULL DEFAULT 'decision_persistence',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CognitiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveTrace" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "input" TEXT,
    "output" TEXT,
    "confidence" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "sequence" INTEGER NOT NULL,
    "sourceEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CognitiveTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceReference" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "decisionId" TEXT,
    "type" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "contribution" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    "content" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfidenceModel" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "dataConfidence" DOUBLE PRECISION,
    "knowledgeConfidence" DOUBLE PRECISION,
    "ruleConfidence" DOUBLE PRECISION,
    "llmConfidence" DOUBLE PRECISION,
    "historicalConfidence" DOUBLE PRECISION,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfidenceModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "sourceAgent" TEXT NOT NULL,
    "targetAgent" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "objective" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "missionId" TEXT,
    "conversationId" TEXT,
    "input" TEXT,
    "output" TEXT,
    "decisionId" TEXT,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityModule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'general',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "inputSchema" TEXT NOT NULL,
    "outputSchema" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "categoryId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'rule',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "relations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProduct" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "author" TEXT NOT NULL DEFAULT 'MealKey',
    "domain" TEXT NOT NULL,
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "requiredContext" TEXT NOT NULL DEFAULT '[]',
    "workflow" TEXT NOT NULL DEFAULT '',
    "outputSchema" TEXT NOT NULL DEFAULT '',
    "manifest" TEXT NOT NULL,
    "pricing" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "producer" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "agentId" TEXT,
    "versionId" TEXT,
    "runtimeId" TEXT,
    "runId" TEXT,
    "traceId" TEXT,
    "decisionId" TEXT,
    "projectId" TEXT,
    "organizationId" TEXT,
    "billingAccountId" TEXT,
    "invoiceId" TEXT,
    "listingId" TEXT,
    "sequence" INTEGER,
    "idempotencyKey" TEXT,
    "payload" TEXT NOT NULL,
    "rawBody" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTrace" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "parentTraceId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputSnapshot" TEXT,
    "outputSnapshot" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "sequence" INTEGER,
    "sourceEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentOutcome" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "source" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "runtimeId" TEXT,
    "agentId" TEXT,
    "versionId" TEXT,
    "billingAccountId" TEXT,
    "usageType" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "tokenInput" INTEGER NOT NULL DEFAULT 0,
    "tokenOutput" INTEGER NOT NULL DEFAULT 0,
    "tokenCached" INTEGER NOT NULL DEFAULT 0,
    "tokenReasoning" INTEGER NOT NULL DEFAULT 0,
    "tokenTotal" INTEGER NOT NULL DEFAULT 0,
    "cost" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "externalUsageId" TEXT,
    "source" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'workspace',
    "status" TEXT NOT NULL DEFAULT 'active',
    "ownerUserId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedByUserId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "balance" TEXT NOT NULL DEFAULT '0',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "includedTokens" INTEGER NOT NULL DEFAULT 0,
    "includedRuns" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "balanceAfter" TEXT,
    "description" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" TEXT NOT NULL DEFAULT '0',
    "tax" TEXT NOT NULL DEFAULT '0',
    "total" TEXT NOT NULL DEFAULT '0',
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "providerTradeNo" TEXT,
    "codeUrl" TEXT,
    "payUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalConsumed" INTEGER NOT NULL DEFAULT 0,
    "frozenAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityPrice" (
    "id" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "baseCost" INTEGER NOT NULL,
    "depthMultipliers" TEXT NOT NULL DEFAULT '{}',
    "complexityMultipliers" TEXT NOT NULL DEFAULT '{}',
    "modelMultipliers" TEXT NOT NULL DEFAULT '{}',
    "dataMultipliers" TEXT NOT NULL DEFAULT '{}',
    "agentMultipliers" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "agentCodes" TEXT NOT NULL DEFAULT '[]',
    "requestedAmount" INTEGER NOT NULL,
    "actualAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AUTHORIZED',
    "reason" TEXT NOT NULL,
    "pricingSnapshot" TEXT,
    "runId" TEXT,
    "tokenInput" INTEGER NOT NULL DEFAULT 0,
    "tokenOutput" INTEGER NOT NULL DEFAULT 0,
    "tokenCached" INTEGER NOT NULL DEFAULT 0,
    "tokenReasoning" INTEGER NOT NULL DEFAULT 0,
    "tokenTotal" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "provider" TEXT,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumptionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEntitlement" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'plan',
    "planId" TEXT,
    "subscriptionId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentListing" (
    "id" TEXT NOT NULL,
    "agentProductId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "pricingModel" TEXT NOT NULL DEFAULT 'subscription',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueShare" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "beneficiaryType" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "sharePercent" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT,
    "decisionId" TEXT,
    "evaluator" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "verdict" TEXT NOT NULL,
    "summary" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRecord" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT,
    "evaluationResultId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "weightDelta" DOUBLE PRECISION,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "agentType" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolArgs" TEXT,
    "toolResult" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'owner',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "conversationId" TEXT,
    "messageId" TEXT,
    "categoryId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "transcript" TEXT,
    "extractedText" TEXT,
    "summary" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "decisionIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerCapability" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 50,
    "evidence" TEXT NOT NULL DEFAULT '{}',
    "improvement" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitionAssessment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "analysis" TEXT NOT NULL,
    "after" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CognitionAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyDocument" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "website" TEXT,
    "contactEmail" TEXT NOT NULL,
    "direction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "verifiedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAgentApplication" (
    "id" TEXT NOT NULL,
    "developerAccountId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "capabilityIds" TEXT NOT NULL DEFAULT '[]',
    "runtimeMode" TEXT NOT NULL DEFAULT 'cloud_https',
    "endpointUrl" TEXT,
    "webhookUrl" TEXT,
    "clientSecretHash" TEXT,
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'draft',
    "currentVersionId" TEXT,
    "listingId" TEXT,
    "agentProductId" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAgentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAgentDraftVersion" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "manifestJson" TEXT NOT NULL,
    "skillPackageJson" TEXT NOT NULL DEFAULT '{}',
    "releaseChannel" TEXT NOT NULL DEFAULT 'draft',
    "demoUrl" TEXT,
    "privacyNotes" TEXT,
    "pricingJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAgentDraftVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSandboxRun" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checksJson" TEXT NOT NULL DEFAULT '{}',
    "qualityReportJson" TEXT,
    "logText" TEXT,
    "invokeId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerSandboxRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerReviewTask" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "checklistJson" TEXT NOT NULL DEFAULT '{}',
    "reviewerUserId" TEXT,
    "decisionNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_userId_key" ON "Owner"("userId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_stage_idx" ON "Project"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_projectId_key" ON "Restaurant"("projectId");

-- CreateIndex
CREATE INDEX "Restaurant_ownerId_idx" ON "Restaurant"("ownerId");

-- CreateIndex
CREATE INDEX "Restaurant_status_idx" ON "Restaurant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantProfile_restaurantId_key" ON "RestaurantProfile"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_restaurantId_key" ON "BrandProfile"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_restaurantId_key" ON "BusinessProfile"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityProfile_restaurantId_key" ON "CapabilityProfile"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "FounderProfile_restaurantId_key" ON "FounderProfile"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionRecord_mkDecisionId_key" ON "DecisionRecord"("mkDecisionId");

-- CreateIndex
CREATE INDEX "DecisionRecord_restaurantId_createdAt_idx" ON "DecisionRecord"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "DecisionRecord_type_idx" ON "DecisionRecord"("type");

-- CreateIndex
CREATE INDEX "DecisionRecord_status_idx" ON "DecisionRecord"("status");

-- CreateIndex
CREATE INDEX "ActionRecord_restaurantId_createdAt_idx" ON "ActionRecord"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionRecord_decisionId_idx" ON "ActionRecord"("decisionId");

-- CreateIndex
CREATE INDEX "ActionRecord_status_idx" ON "ActionRecord"("status");

-- CreateIndex
CREATE INDEX "BrainLearning_restaurantId_createdAt_idx" ON "BrainLearning"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "BrainLearning_pattern_idx" ON "BrainLearning"("pattern");

-- CreateIndex
CREATE INDEX "BrainEvent_restaurantId_createdAt_idx" ON "BrainEvent"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "BrainEvent_type_createdAt_idx" ON "BrainEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvolutionState_restaurantId_key" ON "EvolutionState"("restaurantId");

-- CreateIndex
CREATE INDEX "Memory_ownerId_idx" ON "Memory"("ownerId");

-- CreateIndex
CREATE INDEX "Memory_projectId_idx" ON "Memory"("projectId");

-- CreateIndex
CREATE INDEX "Memory_type_idx" ON "Memory"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Memory_ownerId_projectId_key_key" ON "Memory"("ownerId", "projectId", "key");

-- CreateIndex
CREATE INDEX "IndustryInsight_category_idx" ON "IndustryInsight"("category");

-- CreateIndex
CREATE INDEX "IndustryInsight_outcome_confidence_idx" ON "IndustryInsight"("outcome", "confidence");

-- CreateIndex
CREATE INDEX "IndustryInsight_createdAt_idx" ON "IndustryInsight"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IndustryInsight_fingerprint_key" ON "IndustryInsight"("fingerprint");

-- CreateIndex
CREATE INDEX "Decision_ownerId_idx" ON "Decision"("ownerId");

-- CreateIndex
CREATE INDEX "Decision_projectId_createdAt_idx" ON "Decision"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Decision_type_idx" ON "Decision"("type");

-- CreateIndex
CREATE INDEX "Decision_agentId_idx" ON "Decision"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionEvent_sourceEventId_key" ON "DecisionEvent"("sourceEventId");

-- CreateIndex
CREATE INDEX "DecisionEvent_decisionId_createdAt_idx" ON "DecisionEvent"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "DecisionEvent_eventType_createdAt_idx" ON "DecisionEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "CognitiveSession_agentRunId_createdAt_idx" ON "CognitiveSession"("agentRunId", "createdAt");

-- CreateIndex
CREATE INDEX "CognitiveSession_projectId_createdAt_idx" ON "CognitiveSession"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "CognitiveSession_decisionId_createdAt_idx" ON "CognitiveSession"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "CognitiveSession_status_createdAt_idx" ON "CognitiveSession"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CognitiveTrace_sourceEventId_key" ON "CognitiveTrace"("sourceEventId");

-- CreateIndex
CREATE INDEX "CognitiveTrace_sessionId_sequence_idx" ON "CognitiveTrace"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "CognitiveTrace_type_createdAt_idx" ON "CognitiveTrace"("type", "createdAt");

-- CreateIndex
CREATE INDEX "CognitiveTrace_sourceType_createdAt_idx" ON "CognitiveTrace"("sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "CognitiveTrace_sourceId_idx" ON "CognitiveTrace"("sourceId");

-- CreateIndex
CREATE INDEX "EvidenceReference_sessionId_createdAt_idx" ON "EvidenceReference"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceReference_decisionId_createdAt_idx" ON "EvidenceReference"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceReference_sourceType_sourceId_idx" ON "EvidenceReference"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfidenceModel_sessionId_key" ON "ConfidenceModel"("sessionId");

-- CreateIndex
CREATE INDEX "ConfidenceModel_overall_createdAt_idx" ON "ConfidenceModel"("overall", "createdAt");

-- CreateIndex
CREATE INDEX "Mission_ownerId_idx" ON "Mission"("ownerId");

-- CreateIndex
CREATE INDEX "Mission_sourceAgent_idx" ON "Mission"("sourceAgent");

-- CreateIndex
CREATE INDEX "Mission_targetAgent_idx" ON "Mission"("targetAgent");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE INDEX "AgentRun_agentId_idx" ON "AgentRun"("agentId");

-- CreateIndex
CREATE INDEX "AgentRun_ownerId_idx" ON "AgentRun"("ownerId");

-- CreateIndex
CREATE INDEX "AgentRun_projectId_idx" ON "AgentRun"("projectId");

-- CreateIndex
CREATE INDEX "AgentRun_missionId_idx" ON "AgentRun"("missionId");

-- CreateIndex
CREATE INDEX "AgentRun_conversationId_idx" ON "AgentRun"("conversationId");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityModule_name_key" ON "CapabilityModule"("name");

-- CreateIndex
CREATE INDEX "CapabilityModule_domain_idx" ON "CapabilityModule"("domain");

-- CreateIndex
CREATE INDEX "CapabilityModule_status_idx" ON "CapabilityModule"("status");

-- CreateIndex
CREATE INDEX "KnowledgeNode_categoryId_idx" ON "KnowledgeNode"("categoryId");

-- CreateIndex
CREATE INDEX "KnowledgeNode_type_idx" ON "KnowledgeNode"("type");

-- CreateIndex
CREATE INDEX "KnowledgeNode_status_idx" ON "KnowledgeNode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProduct_slug_key" ON "AgentProduct"("slug");

-- CreateIndex
CREATE INDEX "AgentProduct_domain_idx" ON "AgentProduct"("domain");

-- CreateIndex
CREATE INDEX "AgentProduct_status_idx" ON "AgentProduct"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformEvent_eventId_key" ON "PlatformEvent"("eventId");

-- CreateIndex
CREATE INDEX "PlatformEvent_eventName_occurredAt_idx" ON "PlatformEvent"("eventName", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_runId_occurredAt_idx" ON "PlatformEvent"("runId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_traceId_idx" ON "PlatformEvent"("traceId");

-- CreateIndex
CREATE INDEX "PlatformEvent_billingAccountId_occurredAt_idx" ON "PlatformEvent"("billingAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_idempotencyKey_idx" ON "PlatformEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTrace_sourceEventId_key" ON "AgentTrace"("sourceEventId");

-- CreateIndex
CREATE INDEX "AgentTrace_runId_createdAt_idx" ON "AgentTrace"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTrace_status_createdAt_idx" ON "AgentTrace"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTrace_errorCode_idx" ON "AgentTrace"("errorCode");

-- CreateIndex
CREATE UNIQUE INDEX "AgentOutcome_sourceEventId_key" ON "AgentOutcome"("sourceEventId");

-- CreateIndex
CREATE INDEX "AgentOutcome_runId_createdAt_idx" ON "AgentOutcome"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentOutcome_metricType_idx" ON "AgentOutcome"("metricType");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_sourceEventId_key" ON "UsageRecord"("sourceEventId");

-- CreateIndex
CREATE INDEX "UsageRecord_runId_occurredAt_idx" ON "UsageRecord"("runId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageRecord_billingAccountId_occurredAt_idx" ON "UsageRecord"("billingAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageRecord_usageType_occurredAt_idx" ON "UsageRecord"("usageType", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageRecord_externalUsageId_idx" ON "UsageRecord"("externalUsageId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_ownerUserId_idx" ON "Organization"("ownerUserId");

-- CreateIndex
CREATE INDEX "Organization_status_createdAt_idx" ON "Organization"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_role_status_idx" ON "OrganizationMember"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "BillingAccount_organizationId_idx" ON "BillingAccount"("organizationId");

-- CreateIndex
CREATE INDEX "BillingAccount_ownerId_idx" ON "BillingAccount"("ownerId");

-- CreateIndex
CREATE INDEX "BillingAccount_status_createdAt_idx" ON "BillingAccount"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Plan_status_billingCycle_idx" ON "Plan"("status", "billingCycle");

-- CreateIndex
CREATE INDEX "Subscription_billingAccountId_status_idx" ON "Subscription"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");

-- CreateIndex
CREATE INDEX "CreditLedger_billingAccountId_createdAt_idx" ON "CreditLedger"("billingAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedger_entryType_createdAt_idx" ON "CreditLedger"("entryType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Invoice_billingAccountId_createdAt_idx" ON "Invoice"("billingAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_orderNo_key" ON "PaymentOrder"("orderNo");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_billingAccountId_status_idx" ON "PaymentOrder"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_providerTradeNo_idx" ON "PaymentOrder"("providerTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserWallet_status_updatedAt_idx" ON "UserWallet"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_walletId_createdAt_idx" ON "WalletLedger"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_type_createdAt_idx" ON "WalletLedger"("type", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_referenceId_idx" ON "WalletLedger"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityPrice_capability_key" ON "CapabilityPrice"("capability");

-- CreateIndex
CREATE INDEX "CapabilityPrice_active_idx" ON "CapabilityPrice"("active");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_userId_createdAt_idx" ON "ConsumptionRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_walletId_createdAt_idx" ON "ConsumptionRecord"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_status_createdAt_idx" ON "ConsumptionRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_capability_createdAt_idx" ON "ConsumptionRecord"("capability", "createdAt");

-- CreateIndex
CREATE INDEX "ConsumptionRecord_runId_idx" ON "ConsumptionRecord"("runId");

-- CreateIndex
CREATE INDEX "AgentEntitlement_billingAccountId_status_idx" ON "AgentEntitlement"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "AgentEntitlement_agentCode_status_idx" ON "AgentEntitlement"("agentCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentEntitlement_billingAccountId_agentCode_key" ON "AgentEntitlement"("billingAccountId", "agentCode");

-- CreateIndex
CREATE UNIQUE INDEX "AgentListing_slug_key" ON "AgentListing"("slug");

-- CreateIndex
CREATE INDEX "AgentListing_agentProductId_idx" ON "AgentListing"("agentProductId");

-- CreateIndex
CREATE INDEX "AgentListing_status_visibility_idx" ON "AgentListing"("status", "visibility");

-- CreateIndex
CREATE INDEX "RevenueShare_listingId_status_idx" ON "RevenueShare"("listingId", "status");

-- CreateIndex
CREATE INDEX "RevenueShare_beneficiaryType_beneficiaryId_idx" ON "RevenueShare"("beneficiaryType", "beneficiaryId");

-- CreateIndex
CREATE INDEX "EvaluationResult_agentRunId_createdAt_idx" ON "EvaluationResult"("agentRunId", "createdAt");

-- CreateIndex
CREATE INDEX "EvaluationResult_decisionId_createdAt_idx" ON "EvaluationResult"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "EvaluationResult_verdict_createdAt_idx" ON "EvaluationResult"("verdict", "createdAt");

-- CreateIndex
CREATE INDEX "LearningRecord_decisionId_createdAt_idx" ON "LearningRecord"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningRecord_evaluationResultId_idx" ON "LearningRecord"("evaluationResultId");

-- CreateIndex
CREATE INDEX "LearningRecord_status_createdAt_idx" ON "LearningRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_fromNodeId_idx" ON "KnowledgeEdge"("fromNodeId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_toNodeId_idx" ON "KnowledgeEdge"("toNodeId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_relationType_idx" ON "KnowledgeEdge"("relationType");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_projectId_idx" ON "Conversation"("projectId");

-- CreateIndex
CREATE INDEX "Conversation_agentType_idx" ON "Conversation"("agentType");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_role_idx" ON "Message"("role");

-- CreateIndex
CREATE INDEX "AssetCategory_ownerId_idx" ON "AssetCategory"("ownerId");

-- CreateIndex
CREATE INDEX "AssetCategory_scope_idx" ON "AssetCategory"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_ownerId_slug_key" ON "AssetCategory"("ownerId", "slug");

-- CreateIndex
CREATE INDEX "Asset_ownerId_idx" ON "Asset"("ownerId");

-- CreateIndex
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");

-- CreateIndex
CREATE INDEX "Asset_conversationId_idx" ON "Asset"("conversationId");

-- CreateIndex
CREATE INDEX "Asset_messageId_idx" ON "Asset"("messageId");

-- CreateIndex
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");

-- CreateIndex
CREATE INDEX "Asset_kind_idx" ON "Asset"("kind");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");

-- CreateIndex
CREATE INDEX "Report_type_idx" ON "Report"("type");

-- CreateIndex
CREATE INDEX "OwnerCapability_ownerId_idx" ON "OwnerCapability"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerCapability_ownerId_name_key" ON "OwnerCapability"("ownerId", "name");

-- CreateIndex
CREATE INDEX "CognitionAssessment_ownerId_idx" ON "CognitionAssessment"("ownerId");

-- CreateIndex
CREATE INDEX "CognitionAssessment_topic_idx" ON "CognitionAssessment"("topic");

-- CreateIndex
CREATE INDEX "StrategyDocument_ownerId_idx" ON "StrategyDocument"("ownerId");

-- CreateIndex
CREATE INDEX "StrategyDocument_type_idx" ON "StrategyDocument"("type");

-- CreateIndex
CREATE INDEX "DeveloperAccount_contactEmail_createdAt_idx" ON "DeveloperAccount"("contactEmail", "createdAt");

-- CreateIndex
CREATE INDEX "DeveloperAccount_status_createdAt_idx" ON "DeveloperAccount"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DeveloperAccount_userId_idx" ON "DeveloperAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAgentApplication_agentId_key" ON "PartnerAgentApplication"("agentId");

-- CreateIndex
CREATE INDEX "PartnerAgentApplication_developerAccountId_createdAt_idx" ON "PartnerAgentApplication"("developerAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerAgentApplication_lifecycleStatus_createdAt_idx" ON "PartnerAgentApplication"("lifecycleStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerAgentDraftVersion_applicationId_createdAt_idx" ON "PartnerAgentDraftVersion"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAgentDraftVersion_applicationId_version_key" ON "PartnerAgentDraftVersion"("applicationId", "version");

-- CreateIndex
CREATE INDEX "PartnerSandboxRun_applicationId_startedAt_idx" ON "PartnerSandboxRun"("applicationId", "startedAt");

-- CreateIndex
CREATE INDEX "PartnerSandboxRun_status_startedAt_idx" ON "PartnerSandboxRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "PartnerReviewTask_status_submittedAt_idx" ON "PartnerReviewTask"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "PartnerReviewTask_applicationId_submittedAt_idx" ON "PartnerReviewTask"("applicationId", "submittedAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantProfile" ADD CONSTRAINT "RestaurantProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapabilityProfile" ADD CONSTRAINT "CapabilityProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderProfile" ADD CONSTRAINT "FounderProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRecord" ADD CONSTRAINT "DecisionRecord_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRecord" ADD CONSTRAINT "ActionRecord_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRecord" ADD CONSTRAINT "ActionRecord_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainLearning" ADD CONSTRAINT "BrainLearning_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainEvent" ADD CONSTRAINT "BrainEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionState" ADD CONSTRAINT "EvolutionState_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCategory" ADD CONSTRAINT "KnowledgeCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCategory" ADD CONSTRAINT "AssetCategory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerCapability" ADD CONSTRAINT "OwnerCapability_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitionAssessment" ADD CONSTRAINT "CognitionAssessment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyDocument" ADD CONSTRAINT "StrategyDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgentApplication" ADD CONSTRAINT "PartnerAgentApplication_developerAccountId_fkey" FOREIGN KEY ("developerAccountId") REFERENCES "DeveloperAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgentDraftVersion" ADD CONSTRAINT "PartnerAgentDraftVersion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerAgentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSandboxRun" ADD CONSTRAINT "PartnerSandboxRun_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerAgentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReviewTask" ADD CONSTRAINT "PartnerReviewTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerAgentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

