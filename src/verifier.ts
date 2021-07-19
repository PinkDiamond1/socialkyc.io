import { IRequestClaimsForCTypes, MessageBodyType } from '@kiltprotocol/types';
import { AttestedClaim, Identity } from '@kiltprotocol/core';
import Message, { errorCheckMessageBody } from '@kiltprotocol/messaging';

import { getSession } from './utilities/session';
import { initKilt } from './utilities/initKilt';
import { email } from './CTypes/email';

const form = document.getElementById('subscription-form') as HTMLFormElement;
const success = document.getElementById('subscribed') as HTMLDivElement;
const signUp = document.getElementById('kyc') as HTMLButtonElement;

function handleSuccess() {
  form.hidden = true;
  success.hidden = false;
}

async function handleClick() {
  await initKilt();

  const session = await getSession();

  await session.listen(async (message) => {
    const { body } = message;
    errorCheckMessageBody(body);

    if (body.type !== MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES) {
      return;
    }

    for (const attestedClaimData of body.content) {
      const attestedClaim = AttestedClaim.fromAttestedClaim(attestedClaimData);
      const isValid = await attestedClaim.verify();
      console.log('Valid:', isValid, 'Claim:', attestedClaim);
    }

    handleSuccess();
  });

  const demoIdentity = Identity.buildFromURI('//Alice');

  const messageBody: IRequestClaimsForCTypes = {
    content: [{ cTypeHash: email.hash }],
    type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
  };
  const message = new Message(
    messageBody,
    demoIdentity.getPublicIdentity(),
    session.account,
  );

  await session.send(message);
}

signUp.addEventListener('click', handleClick);
