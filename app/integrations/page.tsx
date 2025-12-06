"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrashIcon } from "lucide-react";

export default function Page() {
  const clientIdRef = useRef<HTMLInputElement>(null);
  const clientSecretRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);

  const createIntegrations = async () => {
    if (!clientIdRef.current || !clientSecretRef.current || !codeRef.current) return;

    const payload = {
      code: codeRef.current.value,
      clientId: clientIdRef.current.value,
      clientSecret: clientSecretRef.current.value,
      provider: "zoho",
    };

    await fetch("/api/zoho/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    fetchIntegrations();
  };

  const fetchIntegrations = async () => {
    const res = await fetch("/api/integrations");
    const data = await res.json();
    setIntegrations(data);
  };

  const deleteIntegration = async (integrationId: string) => {
    const res = await fetch(`/api/integrations/${integrationId}`, {
      method: "DELETE",
    });
    fetchIntegrations();
    if (res.ok) setIntegrations(integrations.filter(integration=> integration._id !== integrationId));
  }

  useEffect(() => {
    fetchIntegrations();
  }, []);

  return (
    <div className="min-h-screen w-full flex justify-center items-start p-10 bg-muted/30">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl w-full">
        
        {/* LEFT: Connect Form */}
        <Card className="shadow-sm border bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Connect Zoho CRM</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <Input placeholder="Enter Zoho Client ID" ref={clientIdRef} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <Input type="password" placeholder="Enter Zoho Client Secret" ref={clientSecretRef} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Authorization Code</label>
              <Input placeholder="Paste Zoho OAuth Code" ref={codeRef} />
            </div>

            <Button className="w-full mt-4" size="lg" onClick={createIntegrations}>
              Connect
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT: Integrations */}
        <Card className="shadow-sm border bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Your Integrations</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {integrations.length === 0 && (
              <p className="text-sm text-muted-foreground">No integrations found.</p>
            )}

            {integrations.map((integration) => (
              <Card key={integration._id} className="p-4 border shadow-none bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-base">{integration.provider}</h3>
                    <p className="text-xs text-muted-foreground">ID: {integration._id}</p>
                  </div>
                <div>
                  <Badge 
                    variant={integration.connected ? "default" : "secondary"} 
                    className="text-xs px-2 py-1 mr-4">
                    {integration.connected ? "Connected" : "Not Connected"}
                  </Badge>
                  <Button variant="destructive" size="sm" onClick={() => deleteIntegration(String(integration._id))}>
                    <TrashIcon size={12} />
                  </Button> 
                </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
