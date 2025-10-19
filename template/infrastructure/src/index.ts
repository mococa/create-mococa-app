/* ---------- External ---------- */
import { Config } from '@pulumi/pulumi';
import { join } from 'node:path';

/* ---------- Resources ---------- */
import { CertificateResource } from './resources/certificate';
import { S3Website } from './resources/s3-website';
import { DNSResource } from './resources/dns';

/* ---------- Components ---------- */
import { BackendComponent } from './components/backend';

/* ---------- Constants ---------- */
import { DOMAIN_BASE, DOMAINS, type Environment } from '@{{PROJECT_NAME}}/constants';

/* ---------- Configuration ---------- */
const config = new Config();
const environment = (config.get('environment') || 'production') as Environment;

/* ---------- Certificate (Cloudflare + ACM) ---------- */
const certificate = new CertificateResource(`certificate-${environment}`, { domain: DOMAIN_BASE });

/* ---------- S3 Website ---------- */
const landingPageDomain = DOMAINS['landing-page'][environment];
const website = new S3Website(`website-${environment}`, {
  path: join(require.resolve('@{{PROJECT_NAME}}/landing-page'), '../ssg'),
  domain: landingPageDomain,
  environment,
});

/* ---------- DNS Records ---------- */
// Website DNS
const websiteSubdomain = landingPageDomain === DOMAIN_BASE ? '@' : landingPageDomain.replace(`.${DOMAIN_BASE}`, '');
new DNSResource(
  `website-dns-${environment}`,
  {
    environment,
    subdomain: websiteSubdomain,
    name: 'website',
    cname: website.website.websiteEndpoint,
    type: 'CNAME',
    comment: 'Main website',
  },
  { dependsOn: [website.website] },
);

/* ---------- Backend ---------- */
const backend = new BackendComponent(
  `backend-${environment}`,
  {
    environment,
    certificateArn: certificate.acm.arn,
  },
  { dependsOn: [certificate.acm] },
);

/* ---------- Exports ---------- */
export const websiteUrl = website.website.websiteEndpoint;
export const apigwUrl = backend.apigateway.api.apiEndpoint;
export const dynamoTableName = backend.dynamo.table.name;
export const s3StorageBucketName = backend.storage.bucket.bucket;
export const cognitoUserPoolId = backend.cognito.userpool.id;
export const cognitoUserPoolClientId = backend.cognito.userpoolClient.id;
