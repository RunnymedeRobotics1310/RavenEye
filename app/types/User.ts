export interface User {
  id: number;
  login: string;
  displayName: string;
  passwordHash: string;
  enabled: boolean;
  forgotPassword: boolean;
  roles: string[];
}
