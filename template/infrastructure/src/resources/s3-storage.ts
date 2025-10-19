/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';
import { s3 } from '@pulumi/aws';
import { S3_STORAGE_BUCKETS, type Environment } from '@{{PROJECT_NAME}}/constants';

/* ---------- Interfaces ---------- */
interface Props {
  environment: string;
}

export class S3StorageResource extends ComponentResource {
  public readonly bucket: s3.BucketV2;
  public readonly access: s3.BucketPublicAccessBlock;
  public readonly versioning: s3.BucketVersioningV2;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { environment } = props;
    const bucketName = S3_STORAGE_BUCKETS[environment as Environment];

    this.bucket = new s3.BucketV2(
      'bucket',
      {
        bucket: bucketName,
        forceDestroy: environment !== 'production',
      },
      { parent: this },
    );

    this.access = new s3.BucketPublicAccessBlock(
      'access',
      {
        bucket: this.bucket.id,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      { parent: this, dependsOn: [this.bucket] },
    );

    this.versioning = new s3.BucketVersioningV2(
      'versioning',
      {
        bucket: this.bucket.id,
        versioningConfiguration: {
          status: 'Enabled',
        },
      },
      { parent: this, dependsOn: [this.bucket] },
    );

    new s3.BucketCorsConfigurationV2(
      'cors',
      {
        bucket: this.bucket.id,
        corsRules: [
          {
            allowedHeaders: ['*'],
            allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
            allowedOrigins: ['*'],
            exposeHeaders: ['ETag'],
            maxAgeSeconds: 3000,
          },
        ],
      },
      { parent: this, dependsOn: [this.bucket] },
    );
  }
}
