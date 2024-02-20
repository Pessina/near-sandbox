"use client";

import React from "react";
import initNear from "../config/near";

const logAccountKeys = async () => {
  const { account } = await initNear();
  try {
    const accessKeys = await account.getAccessKeys();
    console.log("Access Keys:", accessKeys);
  } catch (error) {
    console.error("Failed to fetch access keys:", error);
  }
};

export default function Home() {
  return <button onClick={logAccountKeys}>Log Account Keys</button>;
}
