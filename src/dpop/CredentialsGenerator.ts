import fetch from 'node-fetch'
import { Credentials } from "./DPoPGenerator";

const CREDENTIALS_ENDPOINT = "idp/credentials/"

export class CredentialsGenerator {


  public static async generateCredentials(podServerUri:string, email:string,password:string):Promise<Credentials>{

    // This assumes your server is started under http://localhost:3000/.
    // This URL can also be found by checking the controls in JSON responses when interacting with the IDP API,
    // as described in the Identity Provider section.
    const targetUri = podServerUri + CREDENTIALS_ENDPOINT
    const response = await fetch(targetUri, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // The email/password fields are those of your account.
    // The name field will be used when generating the ID of your token.
    body: JSON.stringify({ email: email, password: password, name: `token-${email}` }),
    });

  // These are the identifier and secret of your token.
  // Store the secret somewhere safe as there is no way to request it again from the server!
  const token = await response.json();
  const {id, secret} = token;
  return {id,secret}
  }

}