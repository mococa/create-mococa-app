/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';
import { s3 } from '@pulumi/aws';
import * as synced from '@pulumi/synced-folder';

/* ---------- Interfaces ---------- */
interface S3WebsiteProps {
  path: string;
  domain: string;
  environment: string;
}

export class S3Website extends ComponentResource {
  public readonly bucket: s3.BucketV2;
  public readonly access: s3.BucketPublicAccessBlock;
  public readonly policy: s3.BucketPolicy;
  public readonly website: s3.BucketWebsiteConfigurationV2;
  public readonly syncedFolder: synced.S3BucketFolder;

  public constructor(name: string, props: S3WebsiteProps, opts?: ComponentResourceOptions) {
    super(`${name}:index`, name, {}, opts);

    const { path, domain, environment } = props;

    this.bucket = new s3.BucketV2(
      `bucket`,
      {
        forceDestroy: true,
        bucket: domain,
      },
      { parent: this },
    );

    this.access = new s3.BucketPublicAccessBlock(
      `access`,
      {
        bucket: this.bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      { parent: this, dependsOn: [this.bucket] },
    );

    this.policy = new s3.BucketPolicy(
      `policy`,
      {
        bucket: this.bucket.id,
        policy: this.bucket.arn.apply((arn) =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Sid: `public-${name}`,
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`${arn}/*`],
              },
            ],
          }),
        ),
      },
      {
        parent: this,
        dependsOn: [this.bucket, this.access],
      },
    );

    new s3.BucketCorsConfigurationV2(
      `cors`,
      {
        bucket: this.bucket.id,
        corsRules: [
          {
            allowedHeaders: ['*'],
            allowedMethods: ['GET'],
            allowedOrigins: ['*'],
            exposeHeaders: [],
          },
        ],
      },
      { parent: this, dependsOn: [this.bucket] },
    );

    this.syncedFolder = new synced.S3BucketFolder(
      `synced-folder`,
      {
        path,
        bucketName: this.bucket.bucket,
        acl: 'private',
      },
      { parent: this, dependsOn: [this.policy, this.bucket] },
    );

    this.website = new s3.BucketWebsiteConfigurationV2(
      `website-config`,
      {
        bucket: this.bucket.id,
        indexDocument: { suffix: 'index.html' },
        errorDocument: { key: '404/index.html' },
      },
      { parent: this, dependsOn: [this.bucket, this.policy, this.access, this.syncedFolder] },
    );
  }
}
