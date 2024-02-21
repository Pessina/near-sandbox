import { useEffect, useState } from "react";
import initNear from "../config/near";
import { Account } from "near-api-js";

const useInitNear = () => {
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { account } = await initNear();
        setAccount(account);
      } catch (error) {
        console.error("Failed to initialize NEAR:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  return { account, isLoading };
};

export default useInitNear;
