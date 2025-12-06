import { ObjectId } from "mongodb";

interface Integration {
    clerkId: string;
    provider: string;
    orgId: string | null;
    connected: boolean;
    createdAt: Date;
}

interface IntegrationCredential {
    integrationId: ObjectId;
    clientIdEnc: string;
    clientSecretEnc: string;
    refreshTokenEnc: string;
    accessTokenEnc: string;
    tokenExpiry: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface Module {
    integrationId: ObjectId;
    module: string;
    active: boolean;
    fieldsToExtract: string[];
    createdAt: Date;
    updatedAt: Date;
}

export type { Integration, IntegrationCredential, Module };