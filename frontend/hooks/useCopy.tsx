"use client";

import { useToast } from "@/hooks/use-toast"
import { useCallback } from "react"

export function useCopy() {
    const { toast } = useToast()

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast({
                title: "Address copied",
                description: "The address has been copied to your clipboard",
            })
        } catch (err) {
            toast({
                title: "Failed to copy",
                description: "Could not copy the address to clipboard",
                variant: "destructive",
            })
        }
    }, [toast])

    return { copyToClipboard }
}
