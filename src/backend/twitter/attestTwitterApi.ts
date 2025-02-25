import { KyInstance } from 'ky/distribution/types/ky';

import { paths } from '../endpoints/paths';
import { pollingOptions } from '../../frontend/utilities/pollingOptions';

import { Input, Output } from './attestTwitter';

export async function attestTwitter(
  json: Input,
  ky: KyInstance,
): Promise<Output> {
  return ky.post(paths.twitter.attest, { json, ...pollingOptions }).json();
}
