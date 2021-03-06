import { readFileSync, writeFileSync } from 'fs';
import * as readline from 'readline';
import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';


interface Options {
  scopes?: string[],
  tokenPath: string,
  credentialPath: string,
}

export default class GoogleAuthenticator {
  scopes: string[];
  tokenPath: string;
  credentialPath: string;
  

  static defaultOptions = {
    scopes: ['https://www.googleapis.com/auth/calendar'],
 }
  
  constructor(options: Options) {
    options = {...GoogleAuthenticator.defaultOptions, ...options};
    this.scopes = options.scopes;
    this.tokenPath = options.tokenPath;
    this.credentialPath = options.credentialPath;
  }

  async getCalendar() {
    let credentials;
    try {
      credentials = JSON.parse(readFileSync(this.credentialPath).toString());
    } catch (err) {
      throw 'Ensure your credentials.json file is present.';
    }
    const auth = GoogleAuthenticator.createOAuth2Client(credentials);
    const token = await this.getToken(auth);
    auth.setCredentials(token)
    return google.calendar({ version: 'v3', auth });
  }

  async getToken(oAuth2Client: OAuth2Client): Promise<Credentials> {
    let token;
    try {
      token = JSON.parse(readFileSync(this.tokenPath).toString());
      await oAuth2Client.getTokenInfo(token.access_token);
      // oAuth2Client.setCredentials(token);
    } catch (err) {
      token = await this.getAccessToken(oAuth2Client);
      writeFileSync(this.tokenPath, JSON.stringify(token));
      console.log('Token stored to', this.tokenPath);
      // oAuth2Client.setCredentials(token);
    }
    return token;
  }

  static createOAuth2Client(credentials): OAuth2Client {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    return new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0],
    );
  }

  async getAccessToken(oAuth2Client: OAuth2Client): Promise<Credentials> {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const code = await readlineQuestion('Enter the code from that page here: ');
    const token = await oAuth2Client.getToken(code);
    return token.tokens;
  }
}

const readlineQuestion = (q: string): Promise<string> => {
    return new Promise((res, rej) => {
      const rl = readline.createInterface({input: process.stdin, output: process.stdout});
      rl.question(q, (text) => {
        res(text)
      })
    })
} 