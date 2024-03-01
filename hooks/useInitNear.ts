import { useEffect, useState } from "react";
import initNear from "../config/near";
import { Account, Near } from "near-api-js";

const useInitNear = () => {
  const [state, setState] = useState<
    { account: Account; connection: Near } | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        setState(await initNear());
      } catch (error) {
        console.error("Failed to initialize NEAR:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  return { ...state, isLoading };
};

export default useInitNear;
