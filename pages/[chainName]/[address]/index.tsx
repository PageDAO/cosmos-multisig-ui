import { MultisigThresholdPubkey, SinglePubkey } from "@cosmjs/amino";
import { Account, StargateClient } from "@cosmjs/stargate";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import HashView from "../../../components/dataViews/HashView";
import MultisigHoldings from "../../../components/dataViews/MultisigHoldings";
import MultisigMembers from "../../../components/dataViews/MultisigMembers";
import Button from "../../../components/inputs/Button";
import Page from "../../../components/layout/Page";
import StackableContainer from "../../../components/layout/StackableContainer";
import { useChains } from "../../../context/ChainsContext";
import { explorerLinkAccount } from "../../../lib/displayHelpers";
import { getMultisigAccount } from "../../../lib/multisigHelpers";

function participantPubkeysFromMultisig(
  multisig: MultisigThresholdPubkey,
): readonly SinglePubkey[] {
  return multisig.value.pubkeys;
}

const Multipage = () => {
  const router = useRouter();
  const { chain } = useChains();

  const [holdings, setHoldings] = useState<readonly Coin[]>([]);
  const [accountOnChain, setAccountOnChain] = useState<Account | null>(null);
  const [pubkey, setPubkey] = useState<MultisigThresholdPubkey>();
  const [accountError, setAccountError] = useState(null);

  const multisigAddress = router.query.address?.toString();
  const explorerLink = explorerLinkAccount(chain.explorerLinks.account, multisigAddress || "");

  const fetchMultisig = useCallback(
    async (address: string) => {
      setAccountError(null);
      try {
        const client = await StargateClient.connect(chain.nodeAddress);
        const tempHoldings = await client.getAllBalances(address);
        setHoldings(tempHoldings);

        const [newPubkey, newAccountOnChain] = await getMultisigAccount(
          address,
          chain.addressPrefix,
          client,
        );
        setPubkey(newPubkey);
        setAccountOnChain(newAccountOnChain);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        setAccountError(error.message);
        console.log("Account error:", error);
      }
    },
    [chain.addressPrefix, chain.nodeAddress],
  );

  useEffect(() => {
    if (multisigAddress) {
      fetchMultisig(multisigAddress);
    }
  }, [fetchMultisig, multisigAddress]);

  return (
    <Page goBack={{ pathname: `/${chain.registryName}`, title: "home" }}>
      <StackableContainer base>
        <StackableContainer>
          <label>Multisig Address</label>
          <h1>{multisigAddress ? <HashView hash={multisigAddress} /> : "No Address"}</h1>
          {explorerLink ? <Button href={explorerLink} label="View in Explorer"></Button> : null}
        </StackableContainer>
        {pubkey ? (
          <MultisigMembers
            members={participantPubkeysFromMultisig(pubkey)}
            addressPrefix={chain.addressPrefix}
            threshold={pubkey.value.threshold}
          />
        ) : null}
        <MultisigHoldings holdings={holdings} />
        {accountError || !accountOnChain ? (
          <StackableContainer>
            <div className="multisig-error">
              {accountError ? (
                <>
                  <p>
                    This multisig address's pubkeys are not available, and so it cannot be used with
                    this tool.
                  </p>
                  <p>
                    You can recreate it with this tool here, or sign and broadcast a transaction
                    with the tool you used to create it. Either option will make the pubkeys
                    accessible and will allow this tool to use this multisig fully.
                  </p>
                </>
              ) : null}
              {!!accountOnChain ? (
                <p>
                  An account needs to be present on chain before creating a transaction. Send some
                  tokens to the address first.
                </p>
              ) : null}
            </div>
          </StackableContainer>
        ) : null}
        <Button
          label="Create New Transaction"
          onClick={() => router.push(`/${chain.registryName}/${multisigAddress}/transaction/new`)}
          disabled={!accountOnChain || !multisigAddress}
        />
      </StackableContainer>
      <style jsx>{`
        label {
          font-size: 12px;
          font-style: italic;
        }
        p {
          margin-top: 15px;
          max-width: 100%;
        }
        .multisig-error p {
          max-width: 550px;
          color: red;
          font-size: 16px;
          line-height: 1.4;
        }
        .multisig-error p:first-child {
          margin-top: 0;
        }
      `}</style>
    </Page>
  );
};

export default Multipage;
