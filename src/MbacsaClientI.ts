import { DPoPInfo } from "./dpop/DPoPGenerator";
import {MintRequest } from './types/Requests';
import { DischargeResponse, MintResponse, PublicDischargeKeyResponse, RevocationResponse } from "./types/Responses";
import { WebID } from "./types/WebID";
import { RSA_JWK } from "pem-jwk";

/**
 * Interface for interacting with MBACSA's Delegation Token API.
 */
export interface MbacsaClientI {

  /**
   * Retrieves a DPoP (Demonstration of Proof-of-Possession) token.
   * @param podServerUri The URI of the pod server.
   * @param email The email of the user.
   * @param password The password of the user.
   * @returns A promise resolving to DPoPInfo.
   */
  retrieveDPoPToken(podServerUri: string, email: string, password: string): Promise<DPoPInfo>;

  /**
   * Requests to mint a delegation token.
   * @param minter The WebID of the entity minting the token.
   * @param requestBody The request body containing minting details.
   * @param dpop The DPoP token info.
   * @returns A promise resolving to a MintResponse.
   */
  mintDelegationToken(minter: WebID, requestBody: MintRequest, dpop: DPoPInfo): Promise<MintResponse>;

  /**
   * Discharges the last third-party caveat of a macaroon.
   * @param serializedMacaroon The serialized macaroon to be discharged.
   * @param dischargee The WebID of the entity to be discharged.
   * @param dpop The DPoP token info for authenticating the dischargee.
   * @returns A promise resolving to a DischargeResponse.
   */
  dischargeLastThirdPartyCaveat(serializedMacaroon: string, dischargee: WebID, dpop: DPoPInfo): Promise<DischargeResponse>;

  /**
   * Retrieves the public discharge key of an agent.
   * @param subject The WebID of the agent.
   * @returns A promise resolving to a PublicDischargeKeyResponse.
   */
  getPublicDischargeKey(subject: WebID): Promise<PublicDischargeKeyResponse>;

  /**
   * Delegates access to another agent using a macaroon.
   * @param serializedMacaroon The serialized root macaroon to be delegated.
   * @param delegatee The WebID of the agent to whom access is being delegated.
   * @param pdk The public discharge key (RSA_JWK) of the delegatee.
   * @returns A promise resolving to the attenuated serialized root macaroon macaroon.
   */
  delegateAccessTo(serializedMacaroon: string, delegatee: WebID, pdk: RSA_JWK): Promise<string>;

  /**
   * Revokes a previously issued delegation token.
   * @param revoker The WebID of the entity revoking the access.
   * @param revokee The WebID of the entity whose access is being revoked.
   * @param serializedMacaroons An array of serialized macaroons that are being revoked.
   * @returns A promise resolving to a RevocationResponse.
   */
  revokeDelegationToken(revoker: WebID, revokee: WebID, serializedMacaroons: Array<string>): Promise<RevocationResponse>;

  /**
   * Accesses a resource using a delegation token.
   * @param resourceURI The URI of the resource to access.
   * @param serializedMacaroons An array of serialized macaroons that grant access to the resource.
   * @returns A promise resolving to the response from accessing the resource.
   */
  accessWithDelegationToken(resourceURI: string, serializedMacaroons: Array<string>): Promise<any>;


}