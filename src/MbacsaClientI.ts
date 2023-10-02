import { Macaroon } from "macaroons.js";
import { DPoPInfo } from "./dpop/DPoPGenerator";
import {MintRequest, DischargeRequest, PublicKeyDischargeRequest, RevocationRequest} from './types/Requests'
import { DischargeResponse, MintResponse, PublicDischargeKeyResponse, RevocationResponse } from "./types/Responses";

/**
 * Interface for interacting with MBACSA's Delegation Token API.
 */
export interface MbacsaClientI {

  mintDelegationToken(minter: WebID, requestBody: MintRequest, dpop: DPoPInfo): Promise<MintResponse>;

  dischargeDelegationToken(dischargee: WebID, requestBody: DischargeRequest, dpop: DPoPInfo): Promise<DischargeResponse>;

  getPublicDischargeKey(subject: WebID):Promise<PublicDischargeKeyResponse>;

  delegateAccessTo(originalMacaroon: Macaroon, delegatee: WebID, mode?: string): Promise<Macaroon>;

  revokeDelegationToken(revocationInfo: RevocationRequest, dpop: DPoPInfo): Promise<RevocationResponse>;

  accessWithDelegationToken(resourceURI: string, serializedMacaroons: Array<string>): Promise<any>;

}