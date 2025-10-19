/* ---------- External ---------- */
import { ComponentResource, ComponentResourceOptions, Config, Output } from '@pulumi/pulumi';
import { Record, RecordArgs } from '@pulumi/cloudflare';

/* ---------- Interfaces ---------- */
type Props = {
  environment: string;
  subdomain: string;
  name: string;
  comment?: RecordArgs['comment'];
} & ({ cname?: Output<string>; type?: 'CNAME' } | { a?: Output<string>; type?: 'A' });

/* ---------- Constants ---------- */
const config = new Config();

export class DNSResource extends ComponentResource {
  public readonly record: Record;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { environment, subdomain, name: resourceName, comment, type } = props;

    if (type === 'CNAME' && !props.cname) throw new Error(`Missing ${resourceName} CNAME.`);
    if (type === 'A' && !props.a) throw new Error(`Missing ${resourceName} A.`);
    if (!type) throw new Error(`Missing ${resourceName} type.`);

    const content = type === 'CNAME' ? props.cname : props.a;

    this.record = new Record(
      `record`,
      {
        name: subdomain,
        zoneId: config.require('cloudflare-zone'),
        type,
        content,
        comment,
        ttl: 1,
        proxied: true,
      },
      { parent: this },
    );
  }
}
