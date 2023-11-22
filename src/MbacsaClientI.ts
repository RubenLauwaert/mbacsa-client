import { Macaroon } from "macaroons.js";
import { DPoPInfo } from "./dpop/DPoPGenerator";
import {MintRequest, DischargeRequest, PublicKeyDischargeRequest, RevocationRequest} from './types/Requests';
import { DischargeResponse, MintResponse, PublicDischargeKeyResponse, RevocationResponse } from "./types/Responses";
import { AccessMode } from "./Util";
import { WebID } from "./types/WebID";

/**
 * Interface for interacting with MBACSA's Delegation Token API.
 */
export interface MbacsaClientI {

  mintDelegationToken(minter: WebID, requestBody: MintRequest, dpop: DPoPInfo): Promise<MintResponse>;

  dischargeLastThirdPartyCaveat(serializedMacaroon:string, dischargee:WebID, dpop: DPoPInfo):Promise<DischargeResponse>;

  getPublicDischargeKey(subject: WebID):Promise<PublicDischargeKeyResponse>;

  delegateAccessTo(serializedMacaroon: string, delegatee: WebID, mode?: string): Promise<string>;

  revokeDelegationToken(revocationInfo: RevocationRequest, dpop: DPoPInfo): Promise<RevocationResponse>;

  accessWithDelegationToken(resourceURI: string, serializedMacaroons: Array<string>): Promise<any>;

  getResource(resourceURI: string, serializedMacaroons: Array<string>) : Promise<any>

}