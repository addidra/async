'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpIcon } from "lucide-react";

export default function ClientHome({ username }: { username: string }) {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [LLMReturnSchema, setLLMReturnSchema] = useState(null);
  const [aiRes, setAiRes] = useState<any>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const create_lead_fields = [
    "Last_Name", "Company", "First_Name", "Title", "Email", "Phone", "Website",
    "Lead_Source", "Annual_Revenue", "No_of_Employees", "Industry", "Street",
    "City", "State", "Zip_Code", "Country", "Description"
  ];

  // Fetch Zoho Fields
  const fetchFields = async () => {
    try {
      const response = await axios.get("/api/schema");
      return response.data;
    } catch (error) {
      console.error("Error fetching fields:", error);
    }
  };

  // Transform fields for LLM
  const transformFieldsForLLM = (fieldsData: any) => {
    if (!fieldsData || !fieldsData.fields) return [];

    return fieldsData.fields
      .filter((field: any) => create_lead_fields.includes(field.api_name))
      .map((field: any) => ({
        name: field.api_name,
        field_id: field.id,
        required: field.system_mandatory,
        type: field.data_type,
        enum: field.pick_list_values
          ? field.pick_list_values.map((o: any) => o.actual_value)
          : null
      }));
  };

  const getLLMRes = async () => {
    try {
      if (!LLMReturnSchema) {
        setAiRes({ status: "error fetching field schema" });
      }

      const response = await axios.post("/api/asyncai", {
        schema: JSON.stringify(LLMReturnSchema),
        prompt: prompt,
      });

      const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) return;

      const parsed = JSON.parse(raw);
      setAiRes(parsed);
    } catch (err) {
      console.error("LLM parsing error:", err);
    }
  };

  async function createLeadInZoho() {
    try {
      const response = await axios.post("/api/zoho/lead", {
        leadData: aiRes?.data,
      });
      console.log("Lead creation response:", response.data);
    } catch (error) {
      console.error("Error creating lead in Zoho:", error);
    }
  }

  // Sync transcript → prompt input
  useEffect(() => {
    setPrompt(transcript);
  }, [transcript]);

  
  useEffect(() => {
    setMounted(true);
    // On mount: fetch schema
    fetchFields()
      .then((data) => transformFieldsForLLM(data))
      .then((transformed) => setLLMReturnSchema(transformed));
    
  }, []);

  if (!mounted) return null;

  if (!browserSupportsSpeechRecognition)
    return <span>Browser doesn't support speech recognition.</span>;

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-zinc-50 dark:bg-black p-6">
      <h1 className="text-3xl font-bold mb-6 self-start">
        Zoho Lead Creator – Hello {username}
      </h1>

      <div className="w-full max-w-2xl border rounded-lg p-4 bg-white dark:bg-zinc-900 shadow">
        <h2 className="text-lg font-semibold mb-2">AI Output</h2>
        <pre className="text-sm p-4 rounded bg-zinc-100 dark:bg-zinc-800 overflow-auto">
          {aiRes ? JSON.stringify(aiRes, null, 2) : "No data yet"}

          <br />
          {aiRes?.data ? (
            <Button variant="default" onClick={createLeadInZoho}>
              Create Lead
            </Button>
          ) : (
            <div>Error: Missing required fields</div>
          )}
        </pre>
      </div>

      <main className="w-full max-w-2xl flex flex-col gap-4 mt-10">
        <div className="flex gap-2">
          <Input
            placeholder="Create Lead..."
            className="flex-1"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <Button onClick={getLLMRes}>
            <ArrowUpIcon size={20} />
          </Button>
        </div>

        <div className="flex gap-4">
          <p>Microphone: {listening ? "on" : "off"}</p>

          <Button
            onClick={() => SpeechRecognition.startListening({ continuous: true })}
          >
            Start
          </Button>

          <Button onClick={SpeechRecognition.stopListening}>Stop</Button>

          <Button onClick={resetTranscript}>Reset</Button>

          <p>{transcript || "Nothing yet..."}</p>
        </div>
      </main>
    </div>
  );
}
