import { RSA_JWK } from "pem-jwk";


export interface MintRequest {
  resourceURI: string,
  requestor: string,
  requestedAccessMode: string,
  dischargeKey: RSA_JWK;
}

export interface DischargeRequest {
  
  serializedMacaroon: string,
  agentToDischarge: string
}

export interface PublicKeyDischargeRequest {
  subjectToRetrieveKeyFrom: string
}

export interface RevocationRequest {

  serializedMacaroons: Array<string>,
  resourceOwner: string,
  revoker: string,
  revokee: string
}