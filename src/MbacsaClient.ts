import { DPoPInfo } from "./dpop/DPoPGenerator";
import {MintRequest, DischargeRequest, PublicKeyDischargeRequest, RevocationRequest} from './types/Requests'
import { buildAuthenticatedFetch} from '@inrupt/solid-client-authn-core';
import fetch  from 'node-fetch'
import NodeRSA from 'node-rsa'
import macaroons from 'macaroons.js'
import { v4 as uuidv4 } from 'uuid';
import { MbacsaClientI } from "./MbacsaClientI";
import { DischargeResponse, MintResponse, PublicDischargeKeyResponse } from "./types/Responses";
import { Macaroon, MacaroonsBuilder } from "macaroons.js";
import { ENDPOINT_DISCHARGE, ENDPOINT_DISCHARGE_KEY, extractPathToPod, extractPathToPodServer } from "./Util";
import { jwk2pem } from "pem-jwk";



export class MbacsaClient implements MbacsaClientI {



  private async authenticatedDPoPFetch(dpopInfo:DPoPInfo, url:string, init:RequestInit):Promise<Response>{
    const {accessToken, dpopKey} = dpopInfo;
    const authenticatedFetch = await buildAuthenticatedFetch(fetch, accessToken, {dpopKey});
    return await authenticatedFetch(url,init);
  }


  public async mintDelegationToken(mintURI: string, requestBody: MintRequest, dpop: DPoPInfo): Promise<MintResponse> {
    const mintResponse = await this.authenticatedDPoPFetch(dpop,mintURI,{
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const mintData = await mintResponse.json()
    return mintData
  }
  public async dischargeDelegationToken(dischargeURI: string, requestBody: DischargeRequest, dpop: DPoPInfo): Promise<DischargeResponse> {
    const dischargeResponse = await this.authenticatedDPoPFetch(dpop, dischargeURI, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    const dischargeData = await dischargeResponse.json();
    return dischargeData;
  }

  public async getPublicDischargeKey(subject: WebID): Promise<PublicDischargeKeyResponse> {
    const dischargeKeyEndpoint = extractPathToPodServer(subject) + ENDPOINT_DISCHARGE_KEY
    const requestBody:PublicKeyDischargeRequest = {subjectToRetrieveKeyFrom: subject};
    const response = await fetch(dischargeKeyEndpoint, 
      {method: 'POST', 
       headers: { 'Content-Type': 'application/json'}, 
       body: JSON.stringify(requestBody)});

    const data = await response.json()
    return data;
  }


  public async delegateAccessTo(originalMacaroon: Macaroon, delegatee: WebID, mode?: string ): Promise<Macaroon> {

    // Generate encrypted Third-Party caveat to discharge delegatee
    const dischargeKeyDelegateeJWK = await this.getPublicDischargeKey(delegatee);
    const dischargeLocation = extractPathToPodServer(delegatee) + ENDPOINT_DISCHARGE;
    const caveatKey = uuidv4();
    const predicate = `agent = ${delegatee}`;
    const caveatId = caveatKey + "::" + predicate;
    // Encrypt caveat with public discharge key of delegatee
    const rsa = new NodeRSA();
    const dischargeKey = rsa.importKey(jwk2pem(dischargeKeyDelegateeJWK.dischargeKey));
    const encryptedCaveatId = dischargeKey.encrypt(caveatId,'base64').toString();
    // Attenuate original macaroon
    const attenuatedMacaroon = macaroons.MacaroonsBuilder.modify(originalMacaroon)
      .add_third_party_caveat(dischargeLocation,caveatKey,encryptedCaveatId);

    // TODO : add given mode as first-party caveat
    if(mode){
      attenuatedMacaroon.add_first_party_caveat(`mode = ${mode}`)
    }
    return attenuatedMacaroon.getMacaroon();
  }

  public async revokeDelegationToken(revocationURI: string, requestBody: RevocationRequest, dpop: DPoPInfo): Promise<any> {
    throw new Error("Method not implemented.");
  }
  public async accessWithDelegationToken(resourceURI: string, serializedMacaroon: string): Promise<any> {
    throw new Error("Method not implemented.");
  }



}