"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE, START_DATE, DAILY_ALLOWANCE, NUTS_API_URL } from "~/lib/constants";

function AcornStats({ fid }: { fid: number }) {
  const [stats, setStats] = useState({
    sent: 0,
    received: 0,
    failedAttempts: 0,
    lastUpdated: new Date()
  });
  
  // Simulated API call - replace with real API integration
  const calculateAcornStats = useCallback(() => {
    // In real implementation, fetch from API using fid
    const now = new Date();
    const timeDiff = now.getTime() - START_DATE.getTime();
    const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    return {
      sent: Math.floor(Math.random() * 1000) + daysPassed * 10,
      received: Math.floor(Math.random() * 1500) + daysPassed * 15,
      failedAttempts: Math.floor(Math.random() * 50) + daysPassed,
      lastUpdated: now
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(calculateAcornStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateAcornStats]);

  const getDailyReset = () => {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(11, 0, 0, 0);
    if (now > resetTime) resetTime.setDate(resetTime.getDate() + 1);
    return resetTime;
  };

  const remainingNuts = DAILY_ALLOWANCE - (stats.sent % DAILY_ALLOWANCE);
  const nextReset = getDailyReset();
  
  return (
    <Card className="bg-gradient-to-br from-amber-700 to-amber-900 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-3xl">🥜</span>
          Acorn Stats
        </CardTitle>
        <CardDescription className="text-amber-100">
          Tracking since Feb 1, 2025
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-amber-200">Sent</Label>
            <div className="text-xl font-bold">{stats.sent}</div>
          </div>
          <div>
            <Label className="text-amber-200">Received</Label>
            <div className="text-xl font-bold">{stats.received}</div>
          </div>
          <div>
            <Label className="text-amber-200">Daily Remaining</Label>
            <div className="text-xl font-bold">{remainingNuts}</div>
          </div>
          <div>
            <Label className="text-amber-200">Failed Attempts</Label>
            <div className="text-xl font-bold">{stats.failedAttempts}</div>
          </div>
        </div>
        <div className="text-xs text-amber-300">
          Next reset: {nextReset.toUTCString().slice(0, -4)}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {PROJECT_TITLE}
        </h1>
        <AcornStats fid={context?.user?.fid || 0} />
        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={() => sdk.actions.openUrl(`${NUTS_API_URL}/share/${context?.user?.fid}`)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <span>🌰</span>
            Share Stats
          </button>
          <button
            onClick={() => sdk.actions.openUrl(`https://warpcast.com/${context?.user?.username}`)}
            className="bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <span>📊</span>
            Profile
          </button>
        </div>
      </div>
    </div>
  );
}
