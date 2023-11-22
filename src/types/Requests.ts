import { RSA_JWK } from "pem-jwk";
import { WebID } from "./WebID";

export interface MintRequest {
  resourceURI: string,
  requestor: WebID,
  dischargeKey: RSA_JWK;
  mode: string
}

export interface DischargeRequest {
  
  serializedRootMacaroon: string,
  agentToDischarge: WebID,
  mode?: string;
}

export interface PublicKeyDischargeRequest {
  subjectToRetrieveKeyFrom: WebID
}

export interface RevocationRequest {

  serializedMacaroons: Array<string>,
  revoker: WebID,
  revokee: WebID
}