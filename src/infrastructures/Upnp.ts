const natUpnp = require('nat-upnp');
import util from 'util';

const client = natUpnp.createClient();

const portMapping: (...args: any[]) => Promise<ReadonlyArray<any>> = (
  util.promisify(client.portMapping.bind(client))
);
const portUnmapping: (...args: any[]) => Promise<ReadonlyArray<Mapping>> = (
  util.promisify(client.portUnmapping.bind(client))
);
const getMappings: (...args: any[]) => Promise<ReadonlyArray<Mapping>> = (
  util.promisify(client.getMappings.bind(client))
);

interface Mapping {
  public: {
    host: string;
    port: number;
  };
  private: {
    host: string;
    port: number;
  };
  protocol: string;
  enabled: boolean;
  description: string;
  ttl: number;
  local: boolean;
}

export class PortAlreadyAssignedError extends Error {
  name = PortAlreadyAssignedError.name;
}

export default class Upnp {
  constructor(
    private description: string,
  ) {
  }

  /**
   * @throws PortAlreadyAssignedError, Error
   */
  async open(port: number) {
    const mappings = await getMappings();
    if (mappings.some(x => isAlreadyMappedByMe(x, port, this.description))) {
      // not necessary
      return {};
    }
    if (mappings.some(x => x.public.port === port)) {
      throw new PortAlreadyAssignedError();
    }
    await portMapping({
      public: port,
      private: port,
      description: this.description,
    });
  }

  /**
   * @throws Error
   */
  async close(port: number) {
    const mappings = await getMappings({ local: true });
    if (mappings.every(x => isOthersMapping(x, port, this.description))) {
      // it isn't your mapping
      // NOP
      return;
    }
    await portUnmapping({ public: port });
  }
}

function isAlreadyMappedByMe(mapping: Mapping, port: number, description: string) {
  return (
    mapping.local
    && mapping.description === description
    && mapping.public.port === port
    && mapping.private.port === port
  );
}

function isOthersMapping(mapping: Mapping, port: number, description: string) {
  return (
    !mapping.local
    || mapping.public.port !== port
    || mapping.description !== description
  );
}
