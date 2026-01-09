export interface RBJWT {
  // standard fields
  iss: string; // raven-brain
  sub: string; // login
  aud: string; // not-used

  exp: number;
  nbf: number;
  iat: number;

  // ravenbrain fields
  userid: number;
  login: string;
  displayName: string;
  roles: string[];
}
