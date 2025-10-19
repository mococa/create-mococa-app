/* ---------- External ---------- */
import { ComponentResource, ComponentResourceOptions } from '@pulumi/pulumi';
import { OriginCaCertificate } from '@pulumi/cloudflare';
import { PrivateKey, CertRequest } from '@pulumi/tls';
import { Certificate } from '@pulumi/aws/acm';

/* ---------- Interfaces ---------- */
interface CertificateProps {
  domain: string;
}

export class CertificateResource extends ComponentResource {
  certificate: OriginCaCertificate;
  key: PrivateKey;
  request: CertRequest;
  acm: Certificate;

  public constructor(name: string, props: CertificateProps, opts?: ComponentResourceOptions) {
    super(`${name}:index`, name, {}, opts);

    const { domain } = props;

    this.key = new PrivateKey(
      `${name}-key`,
      {
        algorithm: 'RSA',
      },
      { parent: this },
    );

    this.request = new CertRequest(
      `${name}-request`,
      {
        privateKeyPem: this.key.privateKeyPem,
        subject: {
          commonName: domain,
          organization: '{{PROJECT_NAME}}',
        },
      },
      { parent: this, dependsOn: this.key },
    );

    this.certificate = new OriginCaCertificate(
      `${name}-certificate`,
      {
        csr: this.request.certRequestPem,
        hostnames: [`*.${domain}`, domain],
        requestType: 'origin-rsa',
        requestedValidity: 5475, // Valid for 15 years
      },
      { parent: this, dependsOn: this.request },
    );

    this.acm = new Certificate(
      `${name}-acm`,
      {
        certificateBody: this.certificate.certificate,
        privateKey: this.key.privateKeyPem,
      },
      { parent: this },
    );
  }
}
