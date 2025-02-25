import { CType } from '@kiltprotocol/core';
import { ICType } from '@kiltprotocol/types';
import { ConfigService } from '@kiltprotocol/config';

import { signAndSubmit } from '../utilities/signAndSubmit';
import { logger } from '../utilities/logger';
import { configuration } from '../utilities/configuration';
import { cTypeIsStored } from '../utilities/cTypeIsStored';

/** Run this function once to store the CType */
export async function testEmailCType(): Promise<void> {
  const draft = CType.fromProperties('Email', {
    Email: {
      type: 'string',
    },
  });

  if (await cTypeIsStored(draft)) {
    if (configuration.storeDidAndCTypes) {
      logger.info('Email CType is already on the blockchain');
    }
    return;
  }

  if (!configuration.storeDidAndCTypes) {
    throw new Error('Email CType missing, cannot add it');
  }

  logger.warn('Storing Email CType on the blockchain');

  const api = ConfigService.get('api');
  const tx = api.tx.ctype.add(CType.toChain(draft));
  await signAndSubmit(tx);

  logger.warn(draft, 'Email CType');
}

// This object was logged by storeEmailCType()
export const emailCType: ICType = {
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'Email',
  properties: {
    Email: {
      type: 'string',
    },
  },
  type: 'object',
  $id: 'kilt:ctype:0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac',
};
