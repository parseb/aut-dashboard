/* eslint-disable max-len */
import { lazy, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { useAppDispatch } from "@store/store.model";
import SWSnackbar from "./components/snackbar";
import Web3DautConnect from "@api/ProviderFactory/web3-daut-connect";
import { NetworkConfig } from "@api/ProviderFactory/network.config";
import { environment } from "@api/environment";
import { ethers } from "ethers";
import { DAppProvider, Config, MetamaskConnector } from "@usedapp/core";
import { WalletConnectConnector } from "@usedapp/wallet-connect-connector";
import { setNetworks } from "@store/WalletProvider/WalletProvider";
import { getAppConfig } from "@api/aut.api";
import AutSDK from "@aut-labs/sdk";
import { IsAuthenticated } from "@auth/auth.reducer";
import GetStarted from "./pages/GetStarted/GetStarted";
import AutLoading from "@components/AutLoading";
import ErrorPage from "@components/ErrorPage";
import Callback from "./pages/Oauth2Callback/Callback";
import Admins from "./pages/Admins/Admins";
import { CommunityData } from "@store/Community/community.reducer";

const AutDashboardMain = lazy(() => import("./pages/AutDashboardMain"));

const generateConfig = (networks: NetworkConfig[]): Config => {
  const enabled_networks = networks.filter((n) => !n.disabled);
  const readOnlyUrls = enabled_networks.reduce((prev, curr) => {
    const network = {
      name: "mumbai",
      chainId: 80001,
      _defaultProvider: (providers) =>
        new providers.JsonRpcProvider(curr.rpcUrls[0])
    };
    const provider = ethers.getDefaultProvider(network);
    prev[curr.chainId] = provider;
    return prev;
  }, {});

  return {
    readOnlyUrls,
    notifications: {
      checkInterval: 0,
      expirationPeriod: 0
    },
    autoConnect: false,
    // @ts-ignore
    networks: enabled_networks.map((n) => ({
      isLocalChain: false,
      isTestChain: environment.networkEnv === "testing",
      chainId: n.chainId,
      chainName: n.network,
      rpcUrl: n.rpcUrls[0],
      nativeCurrency: n.nativeCurrency
    })),
    gasLimitBufferPercentage: 50000,
    pollingIntervals: enabled_networks.reduce((prev, curr) => {
      prev[curr.chainId] = 40000;
      return prev;
    }, {}),
    connectors: {
      metamask: new MetamaskConnector(),
      walletConnect: new WalletConnectConnector({
        rpc: enabled_networks.reduce((prev, curr) => {
          // eslint-disable-next-line prefer-destructuring
          prev[curr.chainId] = curr.rpcUrls[0];
          return prev;
        }, {}),
        infuraId: "d8df2cb7844e4a54ab0a782f608749dd"
      })
    }
  };
};

function App() {
  const dispatch = useAppDispatch();
  const [isLoading, setLoading] = useState(true);
  const [config, setConfig] = useState<Config>();
  const [error, setError] = useState(false);
  const isAutheticated = useSelector(IsAuthenticated);
  const communityData = useSelector(CommunityData);
  const location = useLocation();

  const returnUrl = useMemo(() => {
    if (!isAutheticated) return "/";
    const shouldGoToDashboard =
      location.pathname === "/" ||
      !location.pathname.includes(communityData?.name);
    const goTo = shouldGoToDashboard
      ? `/${communityData?.name}`
      : location.pathname;
    const url = location.state?.from;
    return url || goTo;
  }, [isAutheticated, communityData]);

  useEffect(() => {
    getAppConfig()
      .then(async (res) => {
        dispatch(setNetworks(res));
        setConfig(generateConfig(res));
        new AutSDK({
          nftStorageApiKey: environment.nftStorageKey
        });
      })
      .catch(() => {
        setError(true);
      });
  }, []);

  return (
    <>
      <SWSnackbar />
      {error && <ErrorPage />}
      {!error && config && (
        <>
          <DAppProvider config={config}>
            <Web3DautConnect config={config} setLoading={setLoading} />
            <Box
              sx={{
                height: "100%",
                backgroundColor: "transparent"
              }}
              className={isLoading ? "sw-loading" : ""}
            >
              {isLoading ? (
                <AutLoading width="130px" height="130px" />
              ) : (
                <Routes>
                  <Route path="callback" element={<Callback />} />
                  {!isAutheticated && (
                    <>
                      <Route path="/" element={<GetStarted />} />
                      <Route
                        path="*"
                        element={<Navigate to="/" state={{ from: location }} />}
                      />
                    </>
                  )}
                  {isAutheticated && (
                    <>
                      <Route
                        path={`${communityData?.name}/*`}
                        element={<AutDashboardMain />}
                      />
                      <Route path="*" element={<Navigate to={returnUrl} />} />
                    </>
                  )}
                </Routes>
              )}
            </Box>
          </DAppProvider>
        </>
      )}
    </>
  );
}

export default App;
