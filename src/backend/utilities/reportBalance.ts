import { BalanceUtils } from '@kiltprotocol/core';
import { ConfigService } from '@kiltprotocol/config';

import { SendEmailCommand } from '@aws-sdk/client-ses';

import { sesClient } from '../email/sesClient';

import { logger } from './logger';
import { configuration } from './configuration';
import { keypairsPromise } from './keypairs';

const REPORT_THRESHOLD = BalanceUtils.toFemtoKilt(1000);
const REPORT_FREQUENCY = 24 * 60 * 60 * 1000;

async function sendLowBalanceAlert(balance: string) {
  const Data = `The SocialKYC balance is currently low. Please add more KILT coins.

Current balance: ${balance}

This is an automatically generated email.`;

  const { lowBalanceAlertRecipients } = configuration;

  const command = new SendEmailCommand({
    Destination: {
      ToAddresses: lowBalanceAlertRecipients.split(','),
    },
    Source: '"SocialKYC" <attester@socialkyc.io>',
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: 'SocialKYC – Low Balance Alert',
      },
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data,
        },
      },
    },
  });

  await sesClient.send(command);
}

export function reportBalance() {
  setInterval(async () => {
    try {
      const { identity } = await keypairsPromise;
      const api = ConfigService.get('api');
      const balances = (await api.query.system.account(identity.address)).data;

      const free = BalanceUtils.formatKiltBalance(balances.free);
      const reserved = BalanceUtils.formatKiltBalance(balances.reserved);

      logger.info(`Free: ${free}, bonded: ${reserved}`);

      if (balances.free.lt(REPORT_THRESHOLD)) {
        await sendLowBalanceAlert(free);
      }
    } catch (error) {
      logger.error(error, 'Error getting attester balance');
    }
  }, REPORT_FREQUENCY);
}
