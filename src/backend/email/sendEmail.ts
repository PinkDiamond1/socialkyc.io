import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { StatusCodes } from 'http-status-codes';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import {
  Request,
  ResponseObject,
  ResponseToolkit,
  ServerRoute,
} from '@hapi/hapi';
import Boom from '@hapi/boom';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { z } from 'zod';

import { Claim } from '@kiltprotocol/core';

import { configuration } from '../utilities/configuration';
import {
  getSecretForSession,
  getSession,
  getSessionBySecret,
  setSession,
} from '../utilities/sessionStorage';

import { exceptionToError } from '../../frontend/utilities/exceptionToError';
import { exitOnError } from '../utilities/exitOnError';
import { paths } from '../endpoints/paths';

import { sesClient } from './sesClient';
import { sesConnectionState } from './sesConnection';
import { emailCType } from './emailCType';

const isDevEnv =
  configuration.baseUri === 'http://localhost:3000' ||
  'https://dev.socialkyc.io';

const rateLimiter = new RateLimiterMemory({
  duration: 1 * 60,
  points: isDevEnv ? 500 : 5,
});

const htmlTemplatePromise = readFile(
  join(configuration.distFolder, 'email.html'),
  { encoding: 'utf-8' },
);

htmlTemplatePromise.catch(exitOnError);

async function send(url: string, email: string): Promise<void> {
  const Data = `Please confirm your email address by clicking on this link:

${url}

Congrats! You’ve just completed the first step to regaining control over your digital identity.

--\u0020
Thanks,
The SocialKYC Team


The SocialKYC identity verification service is brought to you by B.T.E. BOTLabs Trusted Entity GmbH, a subsidiary of BOTLabs GmbH, the entity that initially developed KILT Protocol.`;

  // Cannot inline the images, webmails ignore them or even drop styles
  const html = (await htmlTemplatePromise)
    .replace('${URL}', url)
    .replace(/src="/g, `src="${configuration.baseUri}`)
    .replace(/url\((['"]?)/g, `url($1${configuration.baseUri}/`);

  const command = new SendEmailCommand({
    Destination: {
      ToAddresses: [email],
    },
    Source: '"SocialKYC" <attester@socialkyc.io>',
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: 'SocialKYC – Please confirm your email address',
      },
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data,
        },
        Html: {
          Charset: 'UTF-8',
          Data: html,
        },
      },
    },
  });

  await sesClient.send(command);
  sesConnectionState.on();
}

const zodPayload = z.object({
  wallet: z.string(),
  email: z.string(),
});

export type Input = z.infer<typeof zodPayload>;

export type Output = void;

async function handler(
  request: Request,
  h: ResponseToolkit,
): Promise<ResponseObject | string> {
  const { logger } = request;
  logger.debug('Send email started');

  try {
    await rateLimiter.consume(request.info.remoteAddress);
    logger.debug('Send email rate limit OK');
  } catch {
    throw Boom.tooManyRequests(
      'Too many requests, please try again in an hour.',
    );
  }

  const session = getSession(request.headers);

  const { wallet, email } = request.payload as Input;
  const { sessionId } = session;
  const secret = getSecretForSession(sessionId);

  const url = new URL(paths.redirect.email, configuration.baseUri);
  url.search = new URLSearchParams({ state: secret, wallet }).toString();

  const claimContents = {
    Email: email,
  };

  const claim = Claim.fromCTypeAndClaimContents(
    emailCType,
    claimContents,
    session.did,
  );

  const sessionWithSecret = getSessionBySecret(secret);

  setSession({ ...sessionWithSecret, claim });

  try {
    const isTestEmail = email.split('@').pop() === 'example.com';

    if (!isTestEmail) {
      await send(url.toString(), email);
      logger.debug('Email request attestation message sent');
    }

    return h.response().code(StatusCodes.NO_CONTENT);
  } catch (exception) {
    throw Boom.boomify(exceptionToError(exception), {
      statusCode: 400,
      message: 'Invalid email syntax',
    });
  }
}

export const sendEmail: ServerRoute = {
  method: 'POST',
  path: paths.email.send,
  handler,
  options: {
    validate: {
      payload: async (payload) => zodPayload.parse(payload),
    },
  },
};
