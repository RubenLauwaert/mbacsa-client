import { Macaroon } from "macaroons.js";
import { DPoPInfo } from "./dpop/DPoPGenerator";
import {MintRequest, DischargeRequest, PublicKeyDischargeRequest, RevocationRequest} from './types/Requests'
import { MintResponse, PublicDischargeKeyResponse } from "./types/Responses";

/**
 * Interface for interacting with MBACSA's Delegation Token API.
 */
export interface MbacsaClientI {
  /**
   * Mint a delegation token for the given resource.
   * @param resourceURI - The URI of the resource.
   * @param requestBody - The request body for minting a delegation token (macaroon).
   * @param dpop - DPoP token information.
   * @returns A promise that resolves with the response from the middleware.
   */
  mintDelegationToken(mintURI: string, requestBody: MintRequest, dpop: DPoPInfo): Promise<MintResponse>;

  /**
   * Discharge a delegation token (macaroon) using the provided discharge URI.
   * @param dischargeURI - The URI for discharging a macaroon.
   * @param requestBody - The discharge request body.
   * @param dpop - DPoP token information.
   * @returns A promise that resolves with the response from the middleware.
   */
  dischargeDelegationToken(dischargeURI: string, requestBody: DischargeRequest, dpop: DPoPInfo): Promise<any>;


  /**
   * Get the public discharge key associated with a dischargeKey URI.
   * This function retrieves the public discharge key for a given dischargeKey URI.
   *
   * @param dischargeKeyURI - The URI for obtaining the public discharge key.
   * @param requestBody - The public discharge key request body.
   * @returns A promise that resolves with the public discharge key or an error response from the middleware.
   * @throws {Error} If the request to obtain the public discharge key fails or the key is not found.
   */
  getPublicDischargeKey(subject: WebID):Promise<PublicDischargeKeyResponse>;


  delegateAccessTo(originalMacaroon: Macaroon, delegatee: WebID, mode?: string): Promise<Macaroon>;



  /**
   * Revoke a delegation token using the provided revocation URI.
   * @param revocationURI - The URI for revoking the token (macaroon).
   * @param requestBody - The revocation request body.
   * @param dpop - DPoP token information.
   * @returns A promise that resolves with the response from the middleware.
   */
  revokeDelegationToken(revocationURI: string, requestBody: RevocationRequest, dpop: DPoPInfo): Promise<any>;

  /**
   * Access a resource using a delegation token.
   * @param resourceURI - The URI of the resource.
   * @param serializedMacaroon - The serialized delegation token (Macaroon).
   * @returns A promise that resolves with the response from the middleware.
   */
  accessWithDelegationToken(resourceURI: string, serializedMacaroon: string): Promise<any>;
}