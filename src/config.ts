import * as dotenv from 'dotenv';

dotenv.config();

interface Config {
  ups: {
    clientId: string;
    clientSecret: string;
    accountNumber: string;
    apiBaseURL: string;
    authBaseURL: string;
  };
  requestTimeout: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: Config = {
  ups: {
    clientId: getEnvVar('UPS_CLIENT_ID'),
    clientSecret: getEnvVar('UPS_CLIENT_SECRET'),
    accountNumber: getEnvVar('UPS_ACCOUNT_NUMBER'),
    apiBaseURL: getEnvVar('UPS_API_BASE_URL', 'https://wwwcie.ups.com/api'),
    authBaseURL: getEnvVar('UPS_AUTH_BASE_URL', 'https://wwwcie.ups.com/security/v1')
  },
  requestTimeout: parseInt(getEnvVar('REQUEST_TIMEOUT_MS', '30000'), 10)
};
