export type IPOStatus = 'UPCOMING' | 'ACTIVE' | 'FINALIZED'

export interface MockIPO {
  id: string
  companyName: string
  tokenSymbol: string
  tokenName: string
  status: IPOStatus
  ipoContractAddress: string
  tokenContractAddress: string
  ipfsCid: string
  softCap: string
  hardCap: string
  totalRaised: string
  pricePerToken: string
  startTime: number
  endTime: number
  companyWallet: string
}

const now = Math.floor(Date.now() / 1000)
const DAY = 86400
const WEEK = 604800

export const mockIPOs: MockIPO[] = [
  {
    id: '1',
    companyName: 'NovaFinance Labs',
    tokenSymbol: 'NOVA',
    tokenName: 'Nova Finance Token',
    status: 'UPCOMING',
    ipoContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    tokenContractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    ipfsCid: 'QmXyz123abc',
    softCap: '100000000000000000000',
    hardCap: '500000000000000000000',
    totalRaised: '0',
    pricePerToken: '1000000000000000',
    startTime: now + WEEK,
    endTime: now + 2 * WEEK,
    companyWallet: '0xCompanyWallet1',
  },
  {
    id: '2',
    companyName: 'QuantumPay Inc',
    tokenSymbol: 'QPAY',
    tokenName: 'Quantum Pay Token',
    status: 'UPCOMING',
    ipoContractAddress: '0x2345678901abcdef1234567890abcdef1234567890',
    tokenContractAddress: '0x1abcdef234567890abcdef1234567890abcdef1234',
    ipfsCid: 'QmAbc456def',
    softCap: '200000000000000000000',
    hardCap: '1000000000000000000000',
    totalRaised: '0',
    pricePerToken: '500000000000000',
    startTime: now + 2 * WEEK,
    endTime: now + 3 * WEEK,
    companyWallet: '0xCompanyWallet2',
  },
  {
    id: '3',
    companyName: 'Synthetix DAO',
    tokenSymbol: 'SYNX',
    tokenName: 'Synthetix DAO Equity',
    status: 'ACTIVE',
    ipoContractAddress: '0x3456789012abcdef1234567890abcdef12345678901',
    tokenContractAddress: '0x2abcdef345678901abcdef1234567890abcdef12345',
    ipfsCid: 'QmDef789ghi',
    softCap: '150000000000000000000',
    hardCap: '750000000000000000000',
    totalRaised: '525000000000000000000',
    pricePerToken: '750000000000000',
    startTime: now - 2 * DAY,
    endTime: now + 5 * DAY,
    companyWallet: '0xCompanyWallet3',
  },
  {
    id: '4',
    companyName: 'ChainVault Protocol',
    tokenSymbol: 'CVLT',
    tokenName: 'ChainVault Token',
    status: 'ACTIVE',
    ipoContractAddress: '0x4567890123abcdef1234567890abcdef123456789012',
    tokenContractAddress: '0x3abcdef456789012abcdef1234567890abcdef123456',
    ipfsCid: 'QmGhi012jkl',
    softCap: '300000000000000000000',
    hardCap: '1200000000000000000000',
    totalRaised: '900000000000000000000',
    pricePerToken: '300000000000000',
    startTime: now - 5 * DAY,
    endTime: now + 10 * DAY,
    companyWallet: '0xCompanyWallet4',
  },
  {
    id: '5',
    companyName: 'Nebula Finance',
    tokenSymbol: 'NEB',
    tokenName: 'Nebula Finance Equity',
    status: 'ACTIVE',
    ipoContractAddress: '0x5678901234abcdef1234567890abcdef1234567890123',
    tokenContractAddress: '0x4abcdef567890123abcdef1234567890abcdef1234567',
    ipfsCid: 'QmJkl345mno',
    softCap: '250000000000000000000',
    hardCap: '1000000000000000000000',
    totalRaised: '150000000000000000000',
    pricePerToken: '1000000000000000',
    startTime: now - DAY,
    endTime: now + 3 * DAY,
    companyWallet: '0xCompanyWallet5',
  },
  {
    id: '6',
    companyName: 'ApexDeFi Holdings',
    tokenSymbol: 'APEX',
    tokenName: 'Apex DeFi Holdings',
    status: 'FINALIZED',
    ipoContractAddress: '0x6789012345abcdef1234567890abcdef12345678901234',
    tokenContractAddress: '0x5abcdef678901234abcdef1234567890abcdef12345678',
    ipfsCid: 'QmMno678pqr',
    softCap: '200000000000000000000',
    hardCap: '800000000000000000000',
    totalRaised: '800000000000000000000',
    pricePerToken: '800000000000000',
    startTime: now - 4 * WEEK,
    endTime: now - WEEK,
    companyWallet: '0xCompanyWallet6',
  },
]
