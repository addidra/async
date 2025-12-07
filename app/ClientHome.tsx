'use client';

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { GoogleGenAI } from '@google/genai';
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, MicIcon, MicOffIcon, RotateCcwIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface LeadData {
  [key: string]: any;
}

interface AIResponse {
  data: LeadData;
  status: 'success' | 'error';
  field?: string[];
}

export default function ClientHome({ username }: { username: string }) {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [LLMReturnSchema, setLLMReturnSchema] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLead, setCurrentLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadStatus, setLeadStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  
  // GenAI chat instance ref
  const chatInstanceRef = useRef<any>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Initialize GenAI
  useEffect(() => {
    aiRef.current = new GoogleGenAI({apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""});
  }, []);

  

  // Create new chat instance
  const createNewChatInstance = () => {
    if (!aiRef.current || !LLMReturnSchema) return null;
    const currentLeadData = currentLead || {};
    const chat = aiRef.current.chats.create({
      model: "gemini-2.5-flash",
      history: [],
      config: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        systemInstruction: SYSTEM_INSTRUCTION(currentLeadData, LLMReturnSchema),
      }
    });

    return chat;
  };

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

  // Send message to conversational AI
  const sendMessage = async () => {
    if (!prompt.trim() || !LLMReturnSchema || !aiRef.current) return;
    console.log("sendMessage")
    const userMessage = prompt.trim();
    setPrompt("");
    resetTranscript();

    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setLoading(true);

    try {
      // Create new chat instance if it doesn't exist
      if (!chatInstanceRef.current) {
        chatInstanceRef.current = createNewChatInstance();
      }

      // Send message to chat instance
      const result = await chatInstanceRef.current.sendMessage({ message: userMessage });
      const responseText = result.text;

      console.log("LLM Response:", responseText);

      // Parse the response
      const parsedResponse: AIResponse = JSON.parse(responseText || "{}");

      if (parsedResponse.data) {
        // Update lead data
        setCurrentLead(parsedResponse.data);
        setLeadStatus(parsedResponse.status);
        setMissingFields(parsedResponse.field || []);

        // Create assistant message
        let assistantMessage = "Lead updated! ";
        if (parsedResponse.status === 'success') {
          assistantMessage += "✅ All required fields are complete.";
        } else {
          assistantMessage += `⚠️ Missing required fields: ${parsedResponse.field?.join(', ')}`;
        }

        setMessages(prev => [...prev, {
          role: 'model',
          content: assistantMessage,
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: "❌ Error processing your request. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Create lead in Zoho
  const createLeadInZoho = async () => {
    if (!currentLead || leadStatus !== 'success') return;

    setLoading(true);
    try {
      const response = await axios.post("/api/zoho/lead", {
        leadData: currentLead,
      });
      
      console.log("Lead created:", response.data);
      
      setMessages(prev => [...prev, {
        role: 'model',
        content: "🎉 Lead successfully created in Zoho CRM!",
        timestamp: new Date()
      }]);

      // Reset after creation
      setTimeout(() => resetConversation(), 2000);
    } catch (error) {
      console.error("Error creating lead:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: "❌ Failed to create lead in Zoho. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Reset conversation - creates new chat instance
  const resetConversation = () => {
    setMessages([]);
    setCurrentLead(null);
    setLeadStatus('idle');
    setMissingFields([]);
    setPrompt("");
    resetTranscript();
    
    // Create new chat instance
    chatInstanceRef.current = createNewChatInstance();
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync transcript to prompt
  useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);

  // Initialize
  useEffect(() => {
    setMounted(true);
    fetchFields()
      .then((data) => transformFieldsForLLM(data))
      .then((transformed) => {
        setLLMReturnSchema(transformed);
      });
  }, []);

  // Create initial chat instance when schema is ready
  useEffect(() => {
    if (LLMReturnSchema && aiRef.current && !chatInstanceRef.current) {
      chatInstanceRef.current = createNewChatInstance();
    }
  }, [LLMReturnSchema]);

  if (!mounted) return null;

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Browser Not Supported</CardTitle>
            <CardDescription>
              Your browser doesn't support speech recognition.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="border-b bg-white dark:bg-zinc-950 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Zoho Lead Creator</h1>
            <p className="text-sm text-muted-foreground">Hello, {username}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetConversation}
            disabled={loading}
          >
            <RotateCcwIcon className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full gap-6 p-6">
        {/* Chat Panel */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              Tell me about your lead, and I'll help you create it step by step.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 px-6">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center p-8">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Start by telling me about your lead...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Example: "Create a lead for John Doe from Acme Corp in Dubai"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {msg.role === 'user' ? 'You' : 'Assistant'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <Separator />

            {/* Input Area */}
            <div className="p-4 space-y-3">
              {/* Voice Controls */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={listening ? "default" : "secondary"}>
                  {listening ? (
                    <>
                      <MicIcon className="w-3 h-3 mr-1" />
                      Listening...
                    </>
                  ) : (
                    <>
                      <MicOffIcon className="w-3 h-3 mr-1" />
                      Microphone Off
                    </>
                  )}
                </Badge>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => SpeechRecognition.startListening({ continuous: true })}
                  disabled={listening}
                >
                  Start
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={SpeechRecognition.stopListening}
                  disabled={!listening}
                >
                  Stop
                </Button>
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type or speak your message..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={loading || !prompt.trim()}
                  size="icon"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUpIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Preview Panel */}
        <Card className="w-96 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lead Preview</CardTitle>
              {leadStatus !== 'idle' && (
                <Badge variant={leadStatus === 'success' ? 'default' : 'destructive'}>
                  {leadStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Incomplete
                    </>
                  )}
                </Badge>
              )}
            </div>
            <CardDescription>
              {currentLead ? 'Current lead information' : 'No lead data yet'}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {currentLead ? (
              <>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {Object.entries(currentLead).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm font-medium break-words">
                          {String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {missingFields.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Missing Required Fields:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {missingFields.map((field) => (
                        <Badge key={field} variant="outline" className="text-xs">
                          {field.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full mt-4"
                  onClick={createLeadInZoho}
                  disabled={leadStatus !== 'success' || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Lead in Zoho'
                  )}
                </Button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <p className="text-sm text-muted-foreground">
                  Start a conversation to create a lead
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SYSTEM_INSTRUCTION(leadData: any, schema: any) {
  return `
    You are an expert at creating/updating ZOHO Leads with intelligent field inference. Operate in CONVERSATION MODE: user may provide info across multiple messages; ALWAYS preserve existing data, merge new info, and update fields when corrected. Never remove data unless explicitly asked.

    CURRENT LEAD DATA:
    ${JSON.stringify(leadData)}

    GOALS:
    1. Extract explicit info from user message.
    2. Merge with existing lead data.
    3. Infer missing values using context.
    4. Output valid JSON per schema.
    5. Validate required fields.

    RULES:

    PERSISTENCE:
    - Keep all fields already collected.
    - New info adds to or updates previous values.
    - Update-trigger words: "change", "update", "correct", "actually", etc.
    - Addition words: "add", "also", "include", "plus", etc.
    - Deletion words: "remove", "delete", "clear", etc.

    LOCATION INFERENCE:
    - Infers country from city/state: Dubai→UAE, London→United Kingdom, New York→United States, Toronto→Canada, Sydney→Australia, Mumbai→India; California→United States; Ontario→Canada; Bavaria→Germany.
    - Fill City/State/Country where logically deducible.

    CONTACT & DATA ENHANCEMENT:
    - Infer company from email domain if Company missing.
    - Ensure website has protocol (add https://).
    - Emails validated and lowercased.
    - Normalize phone numbers; add country code when country known (+971 UAE, +1 US/Canada, +44 UK).

    FINANCIAL LOGIC:
    - Monthly revenue × 12 → annual; quarterly × 4 → annual.
    - Normalize shorthand ("2M"→2000000, "500K"→500000).
    - Detect revenue words: revenue, turnover, sales, income.

    NAME LOGIC:
    - One-word name → Last_Name.
    - Split full names: first = before last space, last = after.
    - Preserve prefixes (Dr., Mr., Mrs.) in Title.

    INDUSTRY & COMPANY INFERENCE:
    - Guess industry if obvious ("tech startup"→Technology).

    LEAD SOURCE RECOGNITION:
    - Identify sources (LinkedIn, Website, Referral, Trade Show, Cold Call, Email Campaign, Advertisement).

    FORMATTING:
    - Standardize capitalization.
    - Strip whitespace.
    - Zip/phone formatting according to country.

    VALIDATION:
    - Required fields must be present or reasonably inferred.
    - If missing: status="error" and list missing fields.
    - Otherwise: status="success".

    OUTPUT:
    - ALWAYS output single-line JSON ONLY.
    - Include all fields from current data + new/updated ones.
    - Format: {"data": {...}, "status":"success|error", "field":["missing_fields"]}

    SCHEMA:
    ${JSON.stringify(schema)}

    EXAMPLES:
    1) User: "Create lead for John Doe, john@gmail.com"
    → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john@gmail.com"},"status":"error","field":["Company"]}

    2) User: "Add phone +971545265615"
    → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john@gmail.com","Phone":"+971545265615"},"status":"error","field":["Company"]}

    3) User: "Company is Acme Corp in Dubai"
    → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john@gmail.com","Phone":"+971545265615","Company":"Acme Corp","City":"Dubai","Country":"UAE"},"status":"success","field":[]}

    4) User: "Actually change email to john.doe@acmecorp.com"
    → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john.doe@acmecorp.com","Phone":"+971545265615","Company":"Acme Corp","City":"Dubai","Country":"UAE"},"status":"success","field":[]}

    Remember: maintain state, merge updates, infer logically, validate required fields, never hallucinate unprovable data.
  `
}