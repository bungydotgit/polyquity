export const IDENTITY_REGISTRY_ADDRESS = '0x610178da211fef7d417bc0e6fed39f05609ad788'
export const POLY_FACTORY_ADDRESS = '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e'
// export const VERIFIER_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export const MINIMAL_ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export const IDENTITY_REGISTRY_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_reclaimVerifier',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_expectedProvider',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getExpectedProvider',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getReclaimVerifier',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_expectedProvider',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_reclaimVerifier',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IReclaimVerifier',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isIdentifierUsed',
    inputs: [{ name: '_identifier', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: 'used', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isVerified',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'registerWithReclaim',
    inputs: [
      {
        name: 'proof',
        type: 'tuple',
        internalType: 'struct IReclaimVerifier.Proof',
        components: [
          {
            name: 'claimInfo',
            type: 'tuple',
            internalType: 'struct IReclaimVerifier.ClaimInfo',
            components: [
              {
                name: 'provider',
                type: 'string',
                internalType: 'string',
              },
              {
                name: 'parameters',
                type: 'string',
                internalType: 'string',
              },
              {
                name: 'context',
                type: 'string',
                internalType: 'string',
              },
            ],
          },
          {
            name: 'signedClaim',
            type: 'tuple',
            internalType: 'struct IReclaimVerifier.SignedClaim',
            components: [
              {
                name: 'claim',
                type: 'tuple',
                internalType: 'struct IReclaimVerifier.CompleteClaimData',
                components: [
                  {
                    name: 'identifier',
                    type: 'bytes32',
                    internalType: 'bytes32',
                  },
                  {
                    name: 'owner',
                    type: 'address',
                    internalType: 'address',
                  },
                  {
                    name: 'timestampS',
                    type: 'uint32',
                    internalType: 'uint32',
                  },
                  {
                    name: 'epoch',
                    type: 'uint32',
                    internalType: 'uint32',
                  },
                ],
              },
              {
                name: 'signatures',
                type: 'bytes[]',
                internalType: 'bytes[]',
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 's_owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 's_paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setPaused',
    inputs: [{ name: '_paused', type: 'bool', internalType: 'bool' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: '_newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'usedIdentifiers',
    inputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PauseToggled',
    inputs: [
      {
        name: 'isPaused',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'UserVerified',
    inputs: [
      {
        name: 'user',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'identifier',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'provider',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'timestamp',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AlreadyVerified',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'DuplicateIdentifier',
    inputs: [{ name: 'identifier', type: 'bytes32', internalType: 'bytes32' }],
  },
  { type: 'error', name: 'EnforcedPause', inputs: [] },
  { type: 'error', name: 'InvalidAddress', inputs: [] },
  {
    type: 'error',
    name: 'InvalidProvider',
    inputs: [
      { name: 'got', type: 'string', internalType: 'string' },
      { name: 'expected', type: 'string', internalType: 'string' },
    ],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'ProofOwnerMismatch',
    inputs: [
      { name: 'proofOwner', type: 'address', internalType: 'address' },
      { name: 'caller', type: 'address', internalType: 'address' },
    ],
  },
] as const

export const POLY_FACTORY_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_identityRegistry', type: 'address', internalType: 'address' },
      { name: '_owner', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createIPO',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct PolyFactory.CreateIPOParams',
        components: [
          { name: 'tokenName', type: 'string', internalType: 'string' },
          { name: 'tokenSymbol', type: 'string', internalType: 'string' },
          { name: 'softCap', type: 'uint256', internalType: 'uint256' },
          { name: 'hardCap', type: 'uint256', internalType: 'uint256' },
          { name: 'tokenPrice', type: 'uint256', internalType: 'uint256' },
          { name: 'startTime', type: 'uint256', internalType: 'uint256' },
          { name: 'endTime', type: 'uint256', internalType: 'uint256' },
          { name: 'companyWallet', type: 'address', internalType: 'address' },
          { name: 'ipfsCID', type: 'string', internalType: 'string' },
        ],
      },
    ],
    outputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'ipo', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createIPO',
    inputs: [
      { name: '_tokenName', type: 'string', internalType: 'string' },
      { name: '_tokenSymbol', type: 'string', internalType: 'string' },
      { name: '_softCap', type: 'uint256', internalType: 'uint256' },
      { name: '_hardCap', type: 'uint256', internalType: 'uint256' },
      { name: '_tokenPrice', type: 'uint256', internalType: 'uint256' },
      { name: '_startTime', type: 'uint256', internalType: 'uint256' },
      { name: '_endTime', type: 'uint256', internalType: 'uint256' },
      { name: '_companyWallet', type: 'address', internalType: 'address' },
      { name: '_ipfsCID', type: 'string', internalType: 'string' },
    ],
    outputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'ipo', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAllDeployedIPOs',
    inputs: [],
    outputs: [{ name: '', type: 'address[]', internalType: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCompanyIPOs',
    inputs: [
      { name: '_companyWallet', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'address[]', internalType: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployedIPOCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokenForIPO',
    inputs: [{ name: '_ipo', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_identityRegistry',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 's_companyIPOs',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 's_deployedIPOs',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 's_ipoToToken',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'IPOCreated',
    inputs: [
      { name: 'ipo', type: 'address', indexed: true, internalType: 'address' },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'companyWallet',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'ipfsCID',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'tokenName',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'tokenSymbol',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'softCap',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'hardCap',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'tokenPrice',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'startTime',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'endTime',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'EmptyIPFSCID', inputs: [] },
  {
    type: 'error',
    name: 'InvalidCreationParameter',
    inputs: [{ name: 'reason', type: 'string', internalType: 'string' }],
  },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
] as const

export const POLY_IPO_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_identityRegistry',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_companyWallet',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_softCap',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_hardCap',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_tokenPrice',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_startTime',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_endTime',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'bid',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  // Add this new view function:
  {
    type: 'function',
    name: 's_totalRaised',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claimRefund',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimTokens',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalize',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getClaimableTokens',
    inputs: [
      {
        name: '_user',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'tokenAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEffectiveState',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'enum PolyIPO.IPOState',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_companyWallet',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_endTime',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_hardCap',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_identityRegistry',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IIdentityRegistry',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_softCap',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_startTime',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_token',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IPolyToken',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_tokenPrice',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'remainingCapacity',
    inputs: [],
    outputs: [
      {
        name: 'remaining',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 's_contributions',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 's_fundsWithdrawn',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 's_state',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'enum PolyIPO.IPOState',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 's_totalRaised',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokensForSale',
    inputs: [],
    outputs: [
      {
        name: 'maxTokens',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferTokenOwnership',
    inputs: [
      {
        name: '_newOwner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawRaisedFunds',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'BidPlaced',
    inputs: [
      {
        name: 'bidder',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'accepted',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'totalContribution',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'totalRaised',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FundsWithdrawn',
    inputs: [
      {
        name: 'companyWallet',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'IPOFinalized',
    inputs: [
      {
        name: 'newState',
        type: 'uint8',
        indexed: true,
        internalType: 'enum PolyIPO.IPOState',
      },
      {
        name: 'totalRaised',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RefundClaimed',
    inputs: [
      {
        name: 'investor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'refundAmount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokenOwnershipTransferred',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokensClaimed',
    inputs: [
      {
        name: 'investor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'tokenAmount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'FundsAlreadyWithdrawn',
    inputs: [],
  },
  {
    type: 'error',
    name: 'IPOEnded',
    inputs: [],
  },
  {
    type: 'error',
    name: 'IPONotStarted',
    inputs: [],
  },
  {
    type: 'error',
    name: 'IPOStillActive',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidParameter',
    inputs: [
      {
        name: 'reason',
        type: 'string',
        internalType: 'string',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidState',
    inputs: [
      {
        name: 'current',
        type: 'uint8',
        internalType: 'enum PolyIPO.IPOState',
      },
      {
        name: 'expected',
        type: 'uint8',
        internalType: 'enum PolyIPO.IPOState',
      },
    ],
  },
  {
    type: 'error',
    name: 'NotCompanyWallet',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NotVerified',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NothingToClaim',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TransferFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroBid',
    inputs: [],
  },
] as const
