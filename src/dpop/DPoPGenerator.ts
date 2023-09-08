import { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch, KeyPair,  } from '@inrupt/solid-client-authn-core';
import fetch from 'node-fetch'
export interface Credentials {
  id:string,
  secret:string
}

export interface DPoPInfo {
  accessToken: string,
  dpopKey: KeyPair
}

interface AccessTokenResponse {
  access_token: string;
  // Other properties, if any
}


export class DPoPGenerator {

  public static async generateDPoPAccessToken(dpopInput:Credentials):Promise<DPoPInfo>{
    const {id, secret} = dpopInput;

    // A key pair is needed for encryption.
    // This function from `solid-client-authn` generates such a pair for you.
    const dpopKey = await generateDpopKeyPair();
    // These are the ID and secret generated in the previous step.
    // Both the ID and the secret need to be form-encoded.
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
    // This URL can be found by looking at the "token_endpoint" field at
    // http://localhost:3000/.well-known/openid-configuration
    // if your server is hosted at http://localhost:3000/.
    const tokenUrl = 'http://localhost:3000/.oidc/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        // The header needs to be in base64 encoding.
        authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
        dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
        
      },
      body: 'grant_type=client_credentials&scope=webid',
    });

    // This is the Access token that will be used to do an authenticated request to the server.
    // The JSON also contains an "expires_in" field in seconds,
    // which you can use to know when you need request a new Access token.
    // This is the Access token that will be used to do an authenticated request to the server.
    // The JSON also contains an "expires_in" field in seconds,
    // which you can use to know when you need request a new Access token.
    const { access_token: accessToken } = await response.json() as AccessTokenResponse;
    

    return {
      accessToken: accessToken,
      dpopKey: dpopKey
    }

  }


}