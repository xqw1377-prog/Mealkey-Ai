
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  image: 'image',
  onboarded: 'onboarded',
  preferences: 'preferences',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt',
  requestedFrom: 'requestedFrom'
};

exports.Prisma.OwnerScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  email: 'email',
  experience: 'experience',
  background: 'background',
  overallScore: 'overallScore',
  strengths: 'strengths',
  weaknesses: 'weaknesses',
  riskTolerance: 'riskTolerance',
  investmentStyle: 'investmentStyle',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  name: 'name',
  description: 'description',
  status: 'status',
  stage: 'stage',
  category: 'category',
  target: 'target',
  city: 'city',
  district: 'district',
  budget: 'budget',
  profile: 'profile',
  currentGoal: 'currentGoal',
  healthScore: 'healthScore',
  confidence: 'confidence',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RestaurantScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  ownerId: 'ownerId',
  name: 'name',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RestaurantProfileScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  category: 'category',
  stage: 'stage',
  city: 'city',
  storeCount: 'storeCount',
  priceRange: 'priceRange',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BrandProfileScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  positioning: 'positioning',
  targetCustomer: 'targetCustomer',
  consumptionScene: 'consumptionScene',
  brandPromise: 'brandPromise',
  competitiveAdvantage: 'competitiveAdvantage',
  brandRisk: 'brandRisk',
  confidence: 'confidence',
  updatedAt: 'updatedAt'
};

exports.Prisma.BusinessProfileScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  monthlyRevenue: 'monthlyRevenue',
  grossMargin: 'grossMargin',
  netMargin: 'netMargin',
  averageTicket: 'averageTicket',
  dailyOrders: 'dailyOrders',
  laborRatio: 'laborRatio',
  rentRatio: 'rentRatio',
  businessModel: 'businessModel',
  updatedAt: 'updatedAt'
};

exports.Prisma.CapabilityProfileScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  strategyScore: 'strategyScore',
  marketScore: 'marketScore',
  productScore: 'productScore',
  financeScore: 'financeScore',
  operationScore: 'operationScore',
  organizationScore: 'organizationScore',
  overallScore: 'overallScore',
  confidence: 'confidence',
  updatedAt: 'updatedAt'
};

exports.Prisma.FounderProfileScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  experience: 'experience',
  decisionStyle: 'decisionStyle',
  riskPreference: 'riskPreference',
  strengthsJson: 'strengthsJson',
  weaknessesJson: 'weaknessesJson',
  blindSpotsJson: 'blindSpotsJson',
  growthTrendJson: 'growthTrendJson',
  updatedAt: 'updatedAt'
};

exports.Prisma.DecisionRecordScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  mkDecisionId: 'mkDecisionId',
  type: 'type',
  question: 'question',
  contextJson: 'contextJson',
  optionsJson: 'optionsJson',
  chosenOption: 'chosenOption',
  aiAssessmentJson: 'aiAssessmentJson',
  councilResultJson: 'councilResultJson',
  expectedOutcomeJson: 'expectedOutcomeJson',
  actualOutcomeJson: 'actualOutcomeJson',
  learningGenerated: 'learningGenerated',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActionRecordScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  decisionId: 'decisionId',
  action: 'action',
  owner: 'owner',
  deadline: 'deadline',
  status: 'status',
  resultJson: 'resultJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BrainLearningScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  pattern: 'pattern',
  insight: 'insight',
  confidence: 'confidence',
  appliedCount: 'appliedCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BrainEventScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  type: 'type',
  payloadJson: 'payloadJson',
  source: 'source',
  createdAt: 'createdAt'
};

exports.Prisma.EvolutionStateScalarFieldEnum = {
  id: 'id',
  restaurantId: 'restaurantId',
  understandingScore: 'understandingScore',
  dataCompleteness: 'dataCompleteness',
  decisionCount: 'decisionCount',
  learningCount: 'learningCount',
  actionCount: 'actionCount',
  lastEvolutionAt: 'lastEvolutionAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MemoryScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  projectId: 'projectId',
  type: 'type',
  key: 'key',
  content: 'content',
  importance: 'importance',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IndustryInsightScalarFieldEnum = {
  id: 'id',
  category: 'category',
  rule: 'rule',
  outcome: 'outcome',
  confidence: 'confidence',
  evidenceLevel: 'evidenceLevel',
  sourceKind: 'sourceKind',
  anonymizedJson: 'anonymizedJson',
  contributorHash: 'contributorHash',
  fingerprint: 'fingerprint',
  supportCount: 'supportCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DecisionScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  projectId: 'projectId',
  agentRunId: 'agentRunId',
  agentId: 'agentId',
  problem: 'problem',
  observation: 'observation',
  diagnosis: 'diagnosis',
  judgement: 'judgement',
  strategy: 'strategy',
  action: 'action',
  confidence: 'confidence',
  evidence: 'evidence',
  outcome: 'outcome',
  learning: 'learning',
  type: 'type',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DecisionEventScalarFieldEnum = {
  id: 'id',
  decisionId: 'decisionId',
  eventType: 'eventType',
  metadata: 'metadata',
  sourceEventId: 'sourceEventId',
  createdAt: 'createdAt'
};

exports.Prisma.CognitiveSessionScalarFieldEnum = {
  id: 'id',
  agentRunId: 'agentRunId',
  projectId: 'projectId',
  decisionId: 'decisionId',
  contextSnapshotRef: 'contextSnapshotRef',
  status: 'status',
  confidenceRef: 'confidenceRef',
  source: 'source',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CognitiveTraceScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  type: 'type',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  input: 'input',
  output: 'output',
  confidence: 'confidence',
  weight: 'weight',
  sequence: 'sequence',
  sourceEventId: 'sourceEventId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EvidenceReferenceScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  decisionId: 'decisionId',
  type: 'type',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  contribution: 'contribution',
  confidence: 'confidence',
  content: 'content',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.ConfidenceModelScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  overall: 'overall',
  dataConfidence: 'dataConfidence',
  knowledgeConfidence: 'knowledgeConfidence',
  ruleConfidence: 'ruleConfidence',
  llmConfidence: 'llmConfidence',
  historicalConfidence: 'historicalConfidence',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MissionScalarFieldEnum = {
  id: 'id',
  sourceAgent: 'sourceAgent',
  targetAgent: 'targetAgent',
  ownerId: 'ownerId',
  projectId: 'projectId',
  objective: 'objective',
  context: 'context',
  status: 'status',
  result: 'result',
  duration: 'duration',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AgentRunScalarFieldEnum = {
  id: 'id',
  agentId: 'agentId',
  ownerId: 'ownerId',
  projectId: 'projectId',
  missionId: 'missionId',
  conversationId: 'conversationId',
  input: 'input',
  output: 'output',
  decisionId: 'decisionId',
  tokens: 'tokens',
  duration: 'duration',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CapabilityModuleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  domain: 'domain',
  version: 'version',
  inputSchema: 'inputSchema',
  outputSchema: 'outputSchema',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KnowledgeNodeScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  categoryId: 'categoryId',
  type: 'type',
  tags: 'tags',
  source: 'source',
  confidence: 'confidence',
  relations: 'relations',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KnowledgeCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  parentId: 'parentId',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt'
};

exports.Prisma.AgentProductScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  description: 'description',
  version: 'version',
  author: 'author',
  domain: 'domain',
  capabilities: 'capabilities',
  requiredContext: 'requiredContext',
  workflow: 'workflow',
  outputSchema: 'outputSchema',
  manifest: 'manifest',
  pricing: 'pricing',
  status: 'status',
  rating: 'rating',
  installs: 'installs',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlatformEventScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  eventName: 'eventName',
  eventVersion: 'eventVersion',
  producer: 'producer',
  source: 'source',
  entityType: 'entityType',
  entityId: 'entityId',
  agentId: 'agentId',
  versionId: 'versionId',
  runtimeId: 'runtimeId',
  runId: 'runId',
  traceId: 'traceId',
  decisionId: 'decisionId',
  projectId: 'projectId',
  organizationId: 'organizationId',
  billingAccountId: 'billingAccountId',
  invoiceId: 'invoiceId',
  listingId: 'listingId',
  sequence: 'sequence',
  idempotencyKey: 'idempotencyKey',
  payload: 'payload',
  rawBody: 'rawBody',
  occurredAt: 'occurredAt',
  receivedAt: 'receivedAt',
  createdAt: 'createdAt'
};

exports.Prisma.AgentTraceScalarFieldEnum = {
  id: 'id',
  runId: 'runId',
  parentTraceId: 'parentTraceId',
  type: 'type',
  source: 'source',
  name: 'name',
  inputSnapshot: 'inputSnapshot',
  outputSnapshot: 'outputSnapshot',
  status: 'status',
  errorCode: 'errorCode',
  retryCount: 'retryCount',
  latencyMs: 'latencyMs',
  sequence: 'sequence',
  sourceEventId: 'sourceEventId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AgentOutcomeScalarFieldEnum = {
  id: 'id',
  runId: 'runId',
  metricType: 'metricType',
  value: 'value',
  unit: 'unit',
  source: 'source',
  sourceEventId: 'sourceEventId',
  createdAt: 'createdAt'
};

exports.Prisma.UsageRecordScalarFieldEnum = {
  id: 'id',
  runId: 'runId',
  runtimeId: 'runtimeId',
  agentId: 'agentId',
  versionId: 'versionId',
  billingAccountId: 'billingAccountId',
  usageType: 'usageType',
  provider: 'provider',
  model: 'model',
  tokenInput: 'tokenInput',
  tokenOutput: 'tokenOutput',
  tokenCached: 'tokenCached',
  tokenReasoning: 'tokenReasoning',
  tokenTotal: 'tokenTotal',
  cost: 'cost',
  currency: 'currency',
  billable: 'billable',
  externalUsageId: 'externalUsageId',
  source: 'source',
  sourceEventId: 'sourceEventId',
  occurredAt: 'occurredAt',
  createdAt: 'createdAt'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  type: 'type',
  status: 'status',
  ownerUserId: 'ownerUserId',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationMemberScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  role: 'role',
  status: 'status',
  invitedByUserId: 'invitedByUserId',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BillingAccountScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  ownerId: 'ownerId',
  name: 'name',
  status: 'status',
  currency: 'currency',
  balance: 'balance',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  billingCycle: 'billingCycle',
  priceCents: 'priceCents',
  currency: 'currency',
  includedTokens: 'includedTokens',
  includedRuns: 'includedRuns',
  status: 'status',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  billingAccountId: 'billingAccountId',
  planId: 'planId',
  status: 'status',
  seats: 'seats',
  startedAt: 'startedAt',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  cancelAtPeriodEnd: 'cancelAtPeriodEnd',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreditLedgerScalarFieldEnum = {
  id: 'id',
  billingAccountId: 'billingAccountId',
  entryType: 'entryType',
  amount: 'amount',
  currency: 'currency',
  balanceAfter: 'balanceAfter',
  description: 'description',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  createdAt: 'createdAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  billingAccountId: 'billingAccountId',
  invoiceNo: 'invoiceNo',
  status: 'status',
  subtotal: 'subtotal',
  tax: 'tax',
  total: 'total',
  currency: 'currency',
  issuedAt: 'issuedAt',
  paidAt: 'paidAt',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentOrderScalarFieldEnum = {
  id: 'id',
  orderNo: 'orderNo',
  userId: 'userId',
  ownerId: 'ownerId',
  billingAccountId: 'billingAccountId',
  planId: 'planId',
  channel: 'channel',
  status: 'status',
  amountCents: 'amountCents',
  currency: 'currency',
  providerTradeNo: 'providerTradeNo',
  codeUrl: 'codeUrl',
  payUrl: 'payUrl',
  paidAt: 'paidAt',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserWalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  balance: 'balance',
  totalPurchased: 'totalPurchased',
  totalConsumed: 'totalConsumed',
  frozenAmount: 'frozenAmount',
  status: 'status',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletLedgerScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  walletId: 'walletId',
  amount: 'amount',
  balanceAfter: 'balanceAfter',
  type: 'type',
  reason: 'reason',
  referenceId: 'referenceId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.CapabilityPriceScalarFieldEnum = {
  id: 'id',
  capability: 'capability',
  baseCost: 'baseCost',
  depthMultipliers: 'depthMultipliers',
  complexityMultipliers: 'complexityMultipliers',
  modelMultipliers: 'modelMultipliers',
  dataMultipliers: 'dataMultipliers',
  agentMultipliers: 'agentMultipliers',
  active: 'active',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConsumptionRecordScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  walletId: 'walletId',
  capability: 'capability',
  agentCodes: 'agentCodes',
  requestedAmount: 'requestedAmount',
  actualAmount: 'actualAmount',
  status: 'status',
  reason: 'reason',
  pricingSnapshot: 'pricingSnapshot',
  runId: 'runId',
  tokenInput: 'tokenInput',
  tokenOutput: 'tokenOutput',
  tokenCached: 'tokenCached',
  tokenReasoning: 'tokenReasoning',
  tokenTotal: 'tokenTotal',
  model: 'model',
  provider: 'provider',
  costCents: 'costCents',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AgentEntitlementScalarFieldEnum = {
  id: 'id',
  billingAccountId: 'billingAccountId',
  agentCode: 'agentCode',
  status: 'status',
  source: 'source',
  planId: 'planId',
  subscriptionId: 'subscriptionId',
  startedAt: 'startedAt',
  endsAt: 'endsAt',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AgentListingScalarFieldEnum = {
  id: 'id',
  agentProductId: 'agentProductId',
  slug: 'slug',
  name: 'name',
  description: 'description',
  status: 'status',
  visibility: 'visibility',
  pricingModel: 'pricingModel',
  priceCents: 'priceCents',
  currency: 'currency',
  installCount: 'installCount',
  rating: 'rating',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RevenueShareScalarFieldEnum = {
  id: 'id',
  listingId: 'listingId',
  beneficiaryType: 'beneficiaryType',
  beneficiaryId: 'beneficiaryId',
  sharePercent: 'sharePercent',
  status: 'status',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EvaluationResultScalarFieldEnum = {
  id: 'id',
  agentRunId: 'agentRunId',
  decisionId: 'decisionId',
  evaluator: 'evaluator',
  score: 'score',
  verdict: 'verdict',
  summary: 'summary',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LearningRecordScalarFieldEnum = {
  id: 'id',
  decisionId: 'decisionId',
  evaluationResultId: 'evaluationResultId',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  title: 'title',
  summary: 'summary',
  status: 'status',
  weightDelta: 'weightDelta',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KnowledgeEdgeScalarFieldEnum = {
  id: 'id',
  fromNodeId: 'fromNodeId',
  toNodeId: 'toNodeId',
  relationType: 'relationType',
  weight: 'weight',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  projectId: 'projectId',
  agentType: 'agentType',
  title: 'title',
  summary: 'summary',
  messageCount: 'messageCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  role: 'role',
  content: 'content',
  toolName: 'toolName',
  toolArgs: 'toolArgs',
  toolResult: 'toolResult',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.AssetCategoryScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  name: 'name',
  slug: 'slug',
  description: 'description',
  scope: 'scope',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  projectId: 'projectId',
  conversationId: 'conversationId',
  messageId: 'messageId',
  categoryId: 'categoryId',
  kind: 'kind',
  title: 'title',
  fileName: 'fileName',
  mimeType: 'mimeType',
  extension: 'extension',
  sizeBytes: 'sizeBytes',
  storagePath: 'storagePath',
  publicUrl: 'publicUrl',
  status: 'status',
  tags: 'tags',
  transcript: 'transcript',
  extractedText: 'extractedText',
  summary: 'summary',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReportScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  type: 'type',
  title: 'title',
  summary: 'summary',
  content: 'content',
  decisionIds: 'decisionIds',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OwnerCapabilityScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  name: 'name',
  category: 'category',
  score: 'score',
  evidence: 'evidence',
  improvement: 'improvement',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CognitionAssessmentScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  topic: 'topic',
  framework: 'framework',
  before: 'before',
  analysis: 'analysis',
  after: 'after',
  outcome: 'outcome',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StrategyDocumentScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  type: 'type',
  title: 'title',
  content: 'content',
  version: 'version',
  status: 'status',
  projectId: 'projectId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeveloperAccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  displayName: 'displayName',
  legalName: 'legalName',
  website: 'website',
  contactEmail: 'contactEmail',
  direction: 'direction',
  status: 'status',
  verifiedAt: 'verifiedAt',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PartnerAgentApplicationScalarFieldEnum = {
  id: 'id',
  developerAccountId: 'developerAccountId',
  agentId: 'agentId',
  name: 'name',
  category: 'category',
  capabilityIds: 'capabilityIds',
  runtimeMode: 'runtimeMode',
  endpointUrl: 'endpointUrl',
  webhookUrl: 'webhookUrl',
  clientSecretHash: 'clientSecretHash',
  lifecycleStatus: 'lifecycleStatus',
  currentVersionId: 'currentVersionId',
  listingId: 'listingId',
  agentProductId: 'agentProductId',
  qualityScore: 'qualityScore',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PartnerAgentDraftVersionScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  version: 'version',
  manifestJson: 'manifestJson',
  skillPackageJson: 'skillPackageJson',
  releaseChannel: 'releaseChannel',
  demoUrl: 'demoUrl',
  privacyNotes: 'privacyNotes',
  pricingJson: 'pricingJson',
  createdAt: 'createdAt'
};

exports.Prisma.PartnerSandboxRunScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  versionId: 'versionId',
  fixtureId: 'fixtureId',
  status: 'status',
  checksJson: 'checksJson',
  qualityReportJson: 'qualityReportJson',
  logText: 'logText',
  invokeId: 'invokeId',
  startedAt: 'startedAt',
  finishedAt: 'finishedAt'
};

exports.Prisma.PartnerReviewTaskScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  versionId: 'versionId',
  status: 'status',
  checklistJson: 'checklistJson',
  reviewerUserId: 'reviewerUserId',
  decisionNote: 'decisionNote',
  submittedAt: 'submittedAt',
  resolvedAt: 'resolvedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  PasswordResetToken: 'PasswordResetToken',
  Owner: 'Owner',
  Project: 'Project',
  Restaurant: 'Restaurant',
  RestaurantProfile: 'RestaurantProfile',
  BrandProfile: 'BrandProfile',
  BusinessProfile: 'BusinessProfile',
  CapabilityProfile: 'CapabilityProfile',
  FounderProfile: 'FounderProfile',
  DecisionRecord: 'DecisionRecord',
  ActionRecord: 'ActionRecord',
  BrainLearning: 'BrainLearning',
  BrainEvent: 'BrainEvent',
  EvolutionState: 'EvolutionState',
  Memory: 'Memory',
  IndustryInsight: 'IndustryInsight',
  Decision: 'Decision',
  DecisionEvent: 'DecisionEvent',
  CognitiveSession: 'CognitiveSession',
  CognitiveTrace: 'CognitiveTrace',
  EvidenceReference: 'EvidenceReference',
  ConfidenceModel: 'ConfidenceModel',
  Mission: 'Mission',
  AgentRun: 'AgentRun',
  CapabilityModule: 'CapabilityModule',
  KnowledgeNode: 'KnowledgeNode',
  KnowledgeCategory: 'KnowledgeCategory',
  AgentProduct: 'AgentProduct',
  PlatformEvent: 'PlatformEvent',
  AgentTrace: 'AgentTrace',
  AgentOutcome: 'AgentOutcome',
  UsageRecord: 'UsageRecord',
  Organization: 'Organization',
  OrganizationMember: 'OrganizationMember',
  BillingAccount: 'BillingAccount',
  Plan: 'Plan',
  Subscription: 'Subscription',
  CreditLedger: 'CreditLedger',
  Invoice: 'Invoice',
  PaymentOrder: 'PaymentOrder',
  UserWallet: 'UserWallet',
  WalletLedger: 'WalletLedger',
  CapabilityPrice: 'CapabilityPrice',
  ConsumptionRecord: 'ConsumptionRecord',
  AgentEntitlement: 'AgentEntitlement',
  AgentListing: 'AgentListing',
  RevenueShare: 'RevenueShare',
  EvaluationResult: 'EvaluationResult',
  LearningRecord: 'LearningRecord',
  KnowledgeEdge: 'KnowledgeEdge',
  Conversation: 'Conversation',
  Message: 'Message',
  AssetCategory: 'AssetCategory',
  Asset: 'Asset',
  Report: 'Report',
  OwnerCapability: 'OwnerCapability',
  CognitionAssessment: 'CognitionAssessment',
  StrategyDocument: 'StrategyDocument',
  DeveloperAccount: 'DeveloperAccount',
  PartnerAgentApplication: 'PartnerAgentApplication',
  PartnerAgentDraftVersion: 'PartnerAgentDraftVersion',
  PartnerSandboxRun: 'PartnerSandboxRun',
  PartnerReviewTask: 'PartnerReviewTask'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
