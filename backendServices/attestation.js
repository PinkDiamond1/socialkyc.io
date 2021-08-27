import { Identity, init } from '@kiltprotocol/core';
import { MessageBodyType } from '@kiltprotocol/types';
import Message from '@kiltprotocol/messaging';

// Peregrine chain does not support the old Kilt Identities.
// Attestations can only be done with DIDs on this chain.
// Fake attestation data necessary until code is refactored to use DIDs.

export async function attestClaim(requestForAttestation) {
  await init({ address: 'wss://kilt-peregrine-stg.kilt.io' });

  // TODO: Replace Identities with DIDs
  const demoDAppIdentity = Identity.buildFromMnemonic(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together',
  );
  const demoDAppPublicIdentity = demoDAppIdentity.getPublicIdentity();

  const demoExtensionIdentity = Identity.buildFromMnemonic(
    'dawn comic glove crumble merge proof angle wife pull oyster type vapor',
  );
  const demoExtensionPublicIdentity = demoExtensionIdentity.getPublicIdentity();

  // const attestation = Attestation.fromRequestAndPublicIdentity(
  //   request,
  //   demoPublicIdentity,
  // );

  // const tx = await attestation.store();

  // await BlockchainUtils.signAndSubmitTx(tx, demoIdentity);

  // const attestedClaim = AttestedClaim.fromRequestAndAttestation(
  //   request,
  //   attestation,
  // );

  const fakeAttestation = {
    claimHash: requestForAttestation.rootHash,
    cTypeHash: requestForAttestation.claim.cTypeHash,
    owner: requestForAttestation.claim.owner,
    delegationId: null,
    revoked: false,
  };

  const fakeBlockHash =
    '0x1470baed4259acb180540ddb7a499cbf234cf120834169c8cb997462ea346909';

  const messageBody = {
    content: { attestation: fakeAttestation },
    type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
  };

  const message = new Message.default(
    messageBody,
    demoDAppPublicIdentity,
    demoExtensionPublicIdentity,
  );

  return {
    email: requestForAttestation.claim.contents['Email'],
    blockHash: fakeBlockHash,
    message,
  };
}
