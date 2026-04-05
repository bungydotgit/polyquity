import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['investor', 'issuer'])
export const ipoStatusEnum = pgEnum('ipo_status', [
  'upcoming',
  'active',
  'finalized',
  'cancelled',
])
export const investmentStatusEnum = pgEnum('investment_status', [
  'locked',
  'claimed',
  'refunded',
])

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  role: userRoleEnum('role').notNull(),
  kycVerifiedAt: timestamp('kyc_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many, one }) => ({
  kycVerifications: many(kycVerifications),
  company: one(companies, {
    fields: [users.walletAddress],
    references: [companies.ownerWallet],
  }),
  investments: many(investments),
}))

// ─── Companies ───────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerWallet: varchar('owner_wallet', { length: 42 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  registrationNumber: varchar('registration_number', { length: 100 }),
  website: varchar('website', { length: 500 }),
  logoIpfsCid: varchar('logo_ipfs_cid', { length: 100 }),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const companiesRelations = relations(companies, ({ many }) => ({
  ipos: many(ipos),
}))

// ─── KYC Verifications ──────────────────────────────────────────────────────

export const kycVerifications = pgTable('kyc_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),
  chainId: integer('chain_id').notNull(),
  signature: text('signature').notNull(),
  verifiedAt: timestamp('verified_at').notNull().defaultNow(),
})

export const kycVerificationsRelations = relations(
  kycVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [kycVerifications.userId],
      references: [users.id],
    }),
  }),
)

// ─── IPOs ────────────────────────────────────────────────────────────────────

export const ipos = pgTable('ipos', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractAddress: varchar('contract_address', { length: 42 })
    .notNull()
    .unique(),
  issuerWallet: varchar('issuer_wallet', { length: 42 }).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  tokenName: varchar('token_name', { length: 100 }).notNull(),
  tokenSymbol: varchar('token_symbol', { length: 20 }).notNull(),
  ipfsDocCid: varchar('ipfs_doc_cid', { length: 100 }),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  pricePerToken: varchar('price_per_token', { length: 100 }).notNull(),
  totalTokens: varchar('total_tokens', { length: 100 }).notNull(),
  totalRaised: varchar('total_raised', { length: 100 }).notNull().default('0'),
  status: ipoStatusEnum('status').notNull().default('upcoming'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const iposRelations = relations(ipos, ({ one, many }) => ({
  company: one(companies, {
    fields: [ipos.companyId],
    references: [companies.id],
  }),
  investments: many(investments),
}))

// ─── Investments ─────────────────────────────────────────────────────────────

export const investments = pgTable('investments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ipoId: uuid('ipo_id')
    .notNull()
    .references(() => ipos.id),
  investorWallet: varchar('investor_wallet', { length: 42 }).notNull(),
  amountWei: varchar('amount_wei', { length: 100 }).notNull(),
  status: investmentStatusEnum('status').notNull().default('locked'),
  txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const investmentsRelations = relations(investments, ({ one }) => ({
  ipo: one(ipos, {
    fields: [investments.ipoId],
    references: [ipos.id],
  }),
  investor: one(users, {
    fields: [investments.investorWallet],
    references: [users.walletAddress],
  }),
}))

// ─── Type exports ────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
export type KycVerification = typeof kycVerifications.$inferSelect
export type NewKycVerification = typeof kycVerifications.$inferInsert
export type Ipo = typeof ipos.$inferSelect
export type NewIpo = typeof ipos.$inferInsert
export type Investment = typeof investments.$inferSelect
export type NewInvestment = typeof investments.$inferInsert
